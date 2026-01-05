# RAG Q&A System

A production-ready FastAPI application for document question-answering using Retrieval-Augmented Generation (RAG). This system allows users to upload documents, process them into vector embeddings, and query them using natural language questions with AI-powered answers.

## 🚀 Features

- **Document Upload & Processing**: Support for PDF, TXT, and CSV files with automatic chunking and embedding
- **Vector Search**: Semantic search using Qdrant Cloud vector database
- **AI-Powered Q&A**: Natural language question answering using OpenAI GPT models
- **Source Attribution**: View source documents used to generate answers for transparency
- **Streaming Responses**: Real-time streaming answers for better user experience
- **RAGAS Evaluation**: Built-in evaluation metrics (faithfulness, answer relevancy) using RAGAS
- **RESTful API**: Clean, well-documented FastAPI endpoints with OpenAPI/Swagger documentation
- **Health Checks**: Health and readiness endpoints for monitoring and orchestration
- **Structured Logging**: Comprehensive logging with structlog for observability

## 🏗️ Architecture

### Tech Stack

- **Framework**: FastAPI (Python 3.12+)
- **RAG Orchestration**: LangChain
- **Vector Database**: Qdrant Cloud
- **Embeddings**: OpenAI `text-embedding-3-small`
- **LLM**: OpenAI GPT-4o-mini
- **Evaluation**: RAGAS (RAG Assessment)
- **Document Processing**: PyPDF, python-docx
- **Configuration**: Pydantic Settings
- **Logging**: Structlog

### System Flow

1. **Document Ingestion**: Upload documents → Extract text → Chunk into segments → Generate embeddings → Store in Qdrant
2. **Query Processing**: User question → Generate query embedding → Semantic search → Retrieve relevant chunks → Generate answer with LLM
3. **Evaluation** (optional): Assess answer quality using RAGAS metrics

## 📋 Prerequisites

- Python 3.12 or higher
- [uv](https://github.com/astral-sh/uv) package manager (recommended) or pip
- OpenAI API key
- Qdrant Cloud account and API key

## 🔧 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd rag-project-class
   ```

2. **Install dependencies using uv**:
   ```bash
   uv sync
   ```

   Or using pip:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   Create a `.env` file in the project root:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Qdrant Cloud Configuration
   QDRANT_URL=https://your-cluster.qdrant.io
   QDRANT_API_KEY=your_qdrant_api_key_here

   # Optional: Override defaults
   COLLECTION_NAME=rag_documents
   CHUNK_SIZE=1000
   CHUNK_OVERLAP=200
   EMBEDDING_MODEL=text-embedding-3-small
   LLM_MODEL=gpt-4o-mini
   LLM_TEMPERATURE=0.0
   RETRIEVAL_K=4
   LOG_LEVEL=INFO
   ```

## 🚀 Usage

### Start the Server

```bash
# Using uv
uv run uvicorn app.main:app --reload

# Or using Python directly
python -m uvicorn app.main:app --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### API Endpoints

#### Health & Status

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (includes Qdrant connectivity)

#### Document Management

- `POST /documents/upload` - Upload and process a document (PDF, TXT, CSV)
  ```bash
  curl -X POST "http://localhost:8000/documents/upload" \
    -H "accept: application/json" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@document.pdf"
  ```

- `GET /documents/info` - Get collection information (document count, status)
- `DELETE /documents/collection` - Delete entire collection (use with caution!)

#### Query & Search

- `POST /query` - Ask a question and get an answer
  ```json
  {
    "question": "What is RAG?",
    "include_sources": true,
    "enable_evaluation": false
  }
  ```

- `POST /query/stream` - Ask a question with streaming response
- `POST /query/search` - Search documents without generating an answer

### Example API Usage

**Upload a document**:
```bash
curl -X POST "http://localhost:8000/documents/upload" \
  -F "file=@example.pdf"
```

**Ask a question**:
```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the main topics discussed?",
    "include_sources": true,
    "enable_evaluation": false
  }'
```

**Get collection info**:
```bash
curl -X GET "http://localhost:8000/documents/info"
```

## 📁 Project Structure

```
rag-project-class/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration management
│   ├── api/
│   │   ├── __init__.py
│   │   ├── schemas.py          # Pydantic models for API
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── health.py       # Health check endpoints
│   │       ├── documents.py    # Document management endpoints
│   │       └── query.py        # Query endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── document_processor.py  # Document processing & chunking
│   │   ├── embeddings.py          # Embedding model management
│   │   ├── vector_store.py        # Qdrant vector store operations
│   │   ├── rag_chain.py           # RAG chain orchestration
│   │   └── ragas_evaluator.py     # RAGAS evaluation integration
│   └── utils/
│       ├── __init__.py
│       └── logger.py              # Logging configuration
├── static/                      # Static files (if using UI)
├── tests/                       # Test files
├── pyproject.toml              # Project configuration & dependencies
├── requirements.txt            # Python dependencies
├── uv.lock                     # Dependency lock file
└── README.md                   # This file
```

## ⚙️ Configuration

All configuration is managed through environment variables (see `.env` file). Key settings:

### Document Processing
- `CHUNK_SIZE`: Size of text chunks (default: 1000)
- `CHUNK_OVERLAP`: Overlap between chunks (default: 200)

### Model Configuration
- `EMBEDDING_MODEL`: OpenAI embedding model (default: `text-embedding-3-small`)
- `LLM_MODEL`: OpenAI LLM model (default: `gpt-4o-mini`)
- `LLM_TEMPERATURE`: LLM temperature (default: 0.0)

### Retrieval
- `RETRIEVAL_K`: Number of documents to retrieve (default: 4)

### RAGAS Evaluation
- `ENABLE_RAGAS_EVALUATION`: Enable RAGAS evaluation (default: true)
- `RAGAS_TIMEOUT_SECONDS`: Evaluation timeout (default: 30.0)

## 🧪 Development

### Setup Development Environment

```bash
# Install with dev dependencies
uv sync --dev

# Or with pip
pip install -e ".[dev]"
```

### Running Tests

```bash
# Using pytest
pytest

# With coverage
pytest --cov=app --cov-report=html
```

### Code Quality

The project uses:
- **Ruff** for linting and formatting
- **Black** for code formatting
- **MyPy** for type checking

```bash
# Format code
ruff format .

# Lint code
ruff check .

# Type check
mypy app
```

## 📊 Evaluation Metrics

When `enable_evaluation=true` in query requests, the system returns RAGAS metrics:

- **Faithfulness** (0-1): Measures factual consistency of the answer with source documents
- **Answer Relevancy** (0-1): Measures how relevant the answer is to the question

## 🔒 Security Notes

- Never commit `.env` files to version control
- Keep API keys secure and rotate them regularly
- Use environment variables or secret management systems in production
- Consider implementing authentication/authorization for production deployments

## 📝 License

MIT License - see LICENSE file for details

## 👤 Author

**vinaygandhi**
- Email: vgandhi1@binghamton.edu

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [RAGAS Documentation](https://docs.ragas.io/)

## 🐛 Troubleshooting

### Common Issues

1. **Qdrant Connection Error**: Verify your `QDRANT_URL` and `QDRANT_API_KEY` are correct
2. **OpenAI API Error**: Check your `OPENAI_API_KEY` is valid and has sufficient credits
3. **Import Errors**: Ensure all dependencies are installed with `uv sync` or `pip install -r requirements.txt`
4. **Document Processing Fails**: Verify the file format is supported (PDF, TXT, CSV)

### Logs

Check application logs for detailed error messages. Log level can be adjusted via `LOG_LEVEL` environment variable.

---

**Version**: 0.1.0
