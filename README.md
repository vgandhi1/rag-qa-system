<div align="center">

# 🤖 RAG Q&A System

### Production-Ready FastAPI Application with AWS App Runner Deployment

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-00a393.svg)](https://fastapi.tiangolo.com)
[![LangChain](https://img.shields.io/badge/LangChain-0.3+-1C3C3C.svg)](https://python.langchain.com)
[![AWS](https://img.shields.io/badge/AWS-App%20Runner-FF9900.svg)](https://aws.amazon.com/apprunner/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

</div>

---

## 📖 Overview

A production-ready FastAPI application for document question-answering using Retrieval-Augmented Generation (RAG). This system allows users to upload documents, process them into vector embeddings, and query them using natural language questions with AI-powered answers.

It is designed for cloud-native deployment using **AWS App Runner**, **ECR**, and **GitHub Actions**.

## 🚀 Features

- **Document Upload & Processing**: Support for PDF, TXT, and CSV files with automatic chunking and embedding
- **Vector Search**: Semantic search using Qdrant Cloud vector database
- **AI-Powered Q&A**: Natural language question answering using OpenAI GPT models
- **Source Attribution**: View source documents used to generate answers for transparency
- **Streaming Responses**: Real-time streaming answers for better user experience
- **RAGAS Evaluation**: Built-in evaluation metrics (faithfulness, answer relevancy)
- **RESTful API**: Clean, well-documented FastAPI endpoints
- **Observability**: Integration with LangSmith and structured logging

## 🏗️ Architecture

### Tech Stack

- **Framework**: FastAPI (Python 3.12+)
- **RAG Orchestration**: LangChain
- **Vector Database**: Qdrant Cloud
- **Embeddings**: OpenAI `text-embedding-3-small`
- **LLM**: OpenAI GPT-4o-mini
- **Infrastructure**: AWS App Runner (Serverless Container) & AWS ECR

## 📋 Prerequisites

- Python 3.12 or higher
- [uv](https://github.com/astral-sh/uv) package manager (recommended) or pip
- OpenAI API key
- Qdrant Cloud account and API key
- AWS CLI (for deployment setup)

## 🔧 Local Installation

1. **Clone the repository**:
   ```bash
   git clone [https://github.com/vgandhi1/rag-qa-system.git](https://github.com/vgandhi1/rag-qa-system.git)
   cd rag-qa-system
   ```

2. **Install dependencies**:
   ```bash
   # Using uv (recommended)
   uv sync

   # Or using pip
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   Create a `.env` file in the project root:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Qdrant Cloud Configuration
   QDRANT_URL=[https://your-cluster.qdrant.io](https://your-cluster.qdrant.io)
   QDRANT_API_KEY=your_qdrant_api_key_here
   
   # Optional: LangSmith Tracing
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your_langchain_api_key
   ```

4. **Start the Server**:
   ```bash
   uv run uvicorn app.main:app --reload
   ```

## 🌐 Access API

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health
- **Web Dashboard**: http://localhost:8000/static/index.html

## 🐳 Docker Support

You can build and run the application locally using Docker to simulate the production environment.

**Build the image:**
```bash
docker build -t rag-qa-system .
```

**Run the container:**
```bash
docker run -p 8000:8000 --env-file .env rag-qa-system
```

The API will be available at `http://localhost:8000`.

## ☁️ Deployment (AWS)

This project is configured for automated deployment to **AWS App Runner** using **GitHub Actions**.

### 1. AWS Resource Setup

First, create the Elastic Container Registry (ECR) repository where Docker images will be stored:

```bash
# Create ECR Repository
aws ecr create-repository --repository-name rag-qa-system --region us-east-1

# Verify Repository
aws ecr describe-repositories
```

Ensure you have an IAM Role created (`AppRunnerECRAccessRole`) that allows App Runner to pull images from ECR.

### 2. GitHub Actions Configuration

To enable the CI/CD pipeline, go to your GitHub repository **Settings** → **Secrets and variables** → **Actions** and add the following repository secrets:

#### AWS Credentials
| Secret Name | Description | Retrieval Command / Note |
|-------------|-------------|--------------------------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key | From AWS IAM Console |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | From AWS IAM Console |
| `APP_RUNNER_ECR_ACCESS_ROLE_ARN` | IAM Role ARN | `aws iam get-role --role-name AppRunnerECRAccessRole --query 'Role.Arn' --output text` |

#### Application Secrets
| Secret Name | Description |
|-------------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API Key |
| `QDRANT_URL` | Qdrant Cluster URL |
| `QDRANT_API_KEY` | Qdrant API Key |
| `LANGSMITH_API_KEY` | (Optional) For observability |

### 3. Deploy

Once secrets are set, any push to the `main` branch will trigger the deployment workflow:
1. GitHub Actions builds the Docker image.
2. Pushes the image to AWS ECR.
3. Updates the AWS App Runner service to deploy the new version.

## 🚀 API Usage

### Document Management

| Endpoint | Method | Description | Example |
|----------|--------|-------------|---------|
| 📤 `/documents/upload` | POST | Upload document | [See below](#upload-document) |
| ℹ️ `/documents/info` | GET | Get collection stats | `curl /documents/info` |
| 🗑️ `/documents/collection` | DELETE | Delete all documents | `curl -X DELETE /documents/collection` |

### Query & Search

| Endpoint | Method | Description | Features |
|----------|--------|-------------|----------|
| 💬 `/query` | POST | Ask a question | Sources, Evaluation |
| 🌊 `/query/stream` | POST | Streaming response | Real-time tokens |
| 🔍 `/query/search` | POST | Search only | No generation |

### Health & Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| ❤️ `/health` | GET | Basic health check |
| ✅ `/health/ready` | GET | Readiness with DB status |

---

## 💡 Usage Examples

### Upload a Document

```bash
curl -X POST "http://localhost:8000/documents/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@research_paper.pdf"
```

**Response:**
```json
{
  "message": "Document uploaded and processed successfully",
  "filename": "research_paper.pdf",
  "chunks_created": 42,
  "document_ids": ["uuid-1", "uuid-2", ...]
}
```

### Ask a Question

```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the main contribution of this paper?",
    "include_sources": true,
    "enable_evaluation": false
  }'
```

**Response:**
```json
{
  "question": "What is the main contribution of this paper?",
  "answer": "The main contribution is...",
  "sources": [
    {
      "content": "Excerpt from page 3...",
      "metadata": {"source": "research_paper.pdf", "page": 3}
    }
  ],
  "processing_time_ms": 1234.5
}
```

## 📊 Evaluation Metrics

When `enable_evaluation=true` in query requests, the system returns RAGAS metrics:
- **Faithfulness** (0-1): Measures factual consistency.
- **Answer Relevancy** (0-1): Measures relevance to the question.

## 📁 Project Structure

```
rag-qa-system/
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

## 👤 Author

**vinaygandhi**
- Email: vgandhi1@binghamton.edu
- GitHub: [vgandhi1](https://github.com/vgandhi1)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [RAGAS Documentation](https://docs.ragas.io/)

## 🐛 Troubleshooting

### Common Issues

1. **Qdrant Connection Error**: Verify your `QDRANT_URL` and `QDRANT_API_KEY` are correct.
2. **OpenAI API Error**: Check your `OPENAI_API_KEY` is valid and has sufficient credits.
3. **Import Errors**: Ensure all dependencies are installed with `uv sync` or `pip install -r requirements.txt`.
4. **Document Processing Fails**: Verify the file format is supported (PDF, TXT, CSV).

### Logs

Check application logs for detailed error messages. Log level can be adjusted via `LOG_LEVEL` environment variable.

---

## 🙏 Acknowledgments

Built with amazing open-source tools:

- 🚀 [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- 🦜 [LangChain](https://python.langchain.com/) - LLM framework
- 🗄️ [Qdrant](https://qdrant.tech/) - Vector database
- 🤖 [OpenAI](https://openai.com/) - AI models
- 🐳 [Docker](https://www.docker.com/) - Containerization
- ☁️ [AWS](https://aws.amazon.com/) - Cloud infrastructure
- 📊 [RAGAS](https://docs.ragas.io/) - RAG evaluation
- 🔍 [LangSmith](https://smith.langchain.com/) - Observability

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

```text
MIT License

Copyright (c) 2025 RAG Q&A System Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

<div align="center">
  <b>Version: 0.1.0</b>
</div>