"""Vector store module for Qdrant operations."""

from functools import lru_cache
from typing import Any
from uuid import uuid4

from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.http.models import Distance, VectorParams

from app.config import get_settings
from app.core.embeddings import get_embeddings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Embedding dimension for text-embedding-3-small
EMBEDDING_DIMENSION = 1536

@lru_cache
def get_qdrant_client() -> QdrantClient:
    """Get cached Qdrant client instance.

    Returns:
        Configured QdrantClient instance
    """
    logger.info(f"Connecting to Qdrant at: {settings.qdrant_url}")

    client = QdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
    )

    logger.info("Qdrant client connected successfully")
    return client


class VectorStoreService:
    """Service for managing vector store operations."""

    def __init__(self, collection_name: str | None = None):
        """Initialize vector store service.

        Args:
            collection_name: Name of the Qdrant collection (default from settings)
        """
        self.collection_name = collection_name or settings.collection_name
        self.client = get_qdrant_client()
        self.embeddings = get_embeddings()

        # Ensure collection exists
        self._ensure_collection()

        # Initialize LangChain Qdrant vector store
        self.vector_store = QdrantVectorStore(
            client=self.client,
            collection_name=self.collection_name,
            embedding=self.embeddings,
        )

        logger.info(f"VectorStoreService initialized for collection: {self.collection_name}")


    def _ensure_collection(self) -> None:
        """Ensure the collection exists, create if not."""
        try:
            collection_info = self.client.get_collection(self.collection_name)
            logger.info(
                f"Collection '{self.collection_name}' exists with "
                f"{collection_info.points_count} points"
            )
        except UnexpectedResponse:
            logger.info(f"Creating collection: {self.collection_name}")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=EMBEDDING_DIMENSION,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Collection '{self.collection_name}' created successfully")

    def add_documents(self, documents: list[Document]) -> list[str]:
        """Add documents to the vector store.

        Args:
            documents: List of Document objects to add

        Returns:
            List of document IDs
        """
        if not documents:
            logger.warning("No documents to add")
            return []

        logger.info(f"Adding {len(documents)} documents to collection")

        # Generate unique IDs for each document
        ids = [str(uuid4()) for _ in documents]

        # Add to vector store
        self.vector_store.add_documents(documents, ids=ids)

        logger.info(f"Successfully added {len(documents)} documents")
        return ids

    def search(
        self,
        query: str,
        k: int | None = None,
    ) -> list[Document]:
        """Search for similar documents.

        Args:
            query: Search query
            k: Number of results to return (default from settings)

        Returns:
            List of similar Document objects
        """
        k = k or settings.retrieval_k
        logger.debug(f"Searching for: {query[:50]}... (k={k})")

        results = self.vector_store.similarity_search(query, k=k)

        logger.debug(f"Found {len(results)} results")
        return results

    def search_with_scores(
        self,
        query: str,
        k: int | None = None,
    ) -> list[tuple[Document, float]]:
        """Search for similar documents with relevance scores.

        Args:
            query: Search query
            k: Number of results to return

        Returns:
            List of (Document, score) tuples
        """
        k = k or settings.retrieval_k
        logger.debug(f"Searching with scores for: {query[:50]}... (k={k})")

        results = self.vector_store.similarity_search_with_score(query, k=k)

        logger.debug(f"Found {len(results)} results with scores")
        return results

    def get_retriever(self, k: int | None = None) -> Any:
        """Get a retriever for the vector store.

        Args:
            k: Number of documents to retrieve

        Returns:
            LangChain retriever object
        """
        k = k or settings.retrieval_k

        return self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": k},
        )

    def delete_collection(self) -> None:
        """Delete the entire collection."""
        logger.warning(f"Deleting collection: {self.collection_name}")
        self.client.delete_collection(self.collection_name)
        logger.info(f"Collection '{self.collection_name}' deleted")

    def get_collection_info(self) -> dict:
        """Get information about the collection.

        Returns:
            Dictionary with collection statistics
        """
        try:
            info = self.client.get_collection(self.collection_name)
            return {
                "name": self.collection_name,
                "points_count": info.points_count,
                "indexed_vectors_count": info.indexed_vectors_count,
                "status": info.status.value,
            }
        except UnexpectedResponse:
            return {
                "name": self.collection_name,
                "points_count": 0,
                "indexed_vectors_count": 0,
                "status": "not_found",
            }

    def get_all_documents(self, limit: int = 10000) -> list[Document]:
        """Get all documents from the vector store.

        Args:
            limit: Maximum number of documents to retrieve

        Returns:
            List of all Document objects
        """
        logger.debug(f"Retrieving all documents (limit={limit})")
        
        try:
            # Use scroll to get all points from Qdrant
            points, _ = self.client.scroll(
                collection_name=self.collection_name,
                limit=limit,
                with_payload=True,
                with_vectors=False,  # We don't need vectors for metadata extraction
            )
            
            documents = []
            for point in points:
                # LangChain Qdrant stores data in payload
                # The structure may vary, so we handle both nested and flat structures
                payload = point.payload or {}
                
                # Try to get page_content and metadata
                # LangChain Qdrant may store them directly or nested
                if isinstance(payload, dict):
                    content = payload.get("page_content") or payload.get("content") or ""
                    # Metadata might be nested or flat
                    if "metadata" in payload:
                        metadata = payload["metadata"]
                    else:
                        # If metadata is flat, extract it (excluding known fields)
                        metadata = {k: v for k, v in payload.items() 
                                  if k not in ["page_content", "content", "text"]}
                else:
                    content = ""
                    metadata = {}
                
                doc = Document(page_content=content, metadata=metadata)
                documents.append(doc)
            
            logger.debug(f"Retrieved {len(documents)} documents")
            return documents
        except Exception as e:
            logger.error(f"Error retrieving all documents: {e}")
            raise

    def get_unique_document_names(self) -> list[str]:
        """Get list of unique document names (sources) from the vector store.

        Returns:
            List of unique document filenames/sources
        """
        logger.debug("Retrieving unique document names")
        
        try:
            documents = self.get_all_documents()
            unique_sources = set()
            
            for doc in documents:
                source = doc.metadata.get("source")
                if source:
                    unique_sources.add(source)
            
            unique_sources_list = sorted(list(unique_sources))
            logger.info(f"Found {len(unique_sources_list)} unique document sources")
            return unique_sources_list
        except Exception as e:
            logger.error(f"Error retrieving unique document names: {e}")
            raise

    def get_documents_by_source(self, source: str) -> list[Document]:
        """Get all chunks from a specific document source.

        Args:
            source: Document source/filename

        Returns:
            List of Document objects from the specified source
        """
        logger.debug(f"Retrieving documents for source: {source}")
        
        try:
            # Get all documents and filter by source in Python
            # This is simpler and more reliable than Qdrant filtering
            all_docs = self.get_all_documents()
            filtered_docs = [
                doc for doc in all_docs 
                if doc.metadata.get("source") == source
            ]
            
            logger.debug(f"Retrieved {len(filtered_docs)} chunks for source: {source}")
            return filtered_docs
        except Exception as e:
            logger.error(f"Error retrieving documents by source: {e}")
            raise

    def health_check(self) -> bool:
        """Check if vector store is healthy.

        Returns:
            True if healthy, False otherwise
        """
        try:
            self.client.get_collections()
            return True
        except Exception as e:
            logger.error(f"Vector store health check failed: {e}")
            return False