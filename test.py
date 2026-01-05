from qdrant_client import QdrantClient

qdrant_client = QdrantClient(
    url="https://71bcadb5-3a12-42ce-9ea1-203339f609d3.us-east-1-1.aws.cloud.qdrant.io:6333", 
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.UKwpfA2IsW7DnPVOiv337WN3q0mwOohi1H-NKtnaL3M",
)

print(qdrant_client.get_collections())