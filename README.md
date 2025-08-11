# Railway Cohere Docs Search Template

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/Hlhb0D?referralCode=t_rL5G)

A **one-click deploy template** that lets anyone create a **searchable knowledge base** from their documents using **Cohere's free embeddings API** and **Postgres with pgvector** on Railway.

## 🚀 Quick Deploy

1. Click the "Deploy on Railway" button above
2. Add your Cohere API key (free from [cohere.com](https://cohere.com))
3. Add the Cohere API Key to the backend service variables on railway.
4. Deploy and wait for services to start
5. Upload your docs and start searching!

   

https://github.com/user-attachments/assets/ed06df1c-d1a4-4770-bc5d-372e02a1f53c



## 📖 What This Template Includes

This demonstrates a **complete multi-service setup**:

- **Frontend** (Next.js) — Simple, clean search interface for users
- **Backend** (Node/Express) — Handles search requests, calls Cohere for embeddings, performs vector similarity search
- **Postgres (pgvector)** — Stores document chunks and their embeddings for fast semantic search
- **Worker** — Ingestion script that reads docs, chunks them, gets embeddings, and stores in DB

## 🎯 Use Cases

Perfect for:

- **Documentation search** for your projects
- **Internal knowledge bases** for teams
- **Content discovery** for blogs and articles
- **Customer support** with FAQ search
- **Research tools** for document collections

## ✨ Key Features

- ✅ **100% free to start** - Uses Cohere's free API tier
- ✅ **One-click Railway deploy** - No complex setup required
- ✅ **Semantic search** - Find content by meaning, not just keywords
- ✅ **File upload interface** - Upload documents directly through the web UI
- ✅ **Multiple file formats** - Supports .txt, .md, .pdf, and .docx files
- ✅ **Scalable architecture** - Add more docs anytime
- ✅ **Modern tech stack** - Next.js, Express, Postgres
- ✅ **Production ready** - Built with Railway's best practices

## 🛠️ How It Works

1. **Upload Documents**: Use the web interface to upload files or place your `.txt`, `.md`, or other text files in the worker's `docs/` folder
2. **Automatic Processing**: The system chunks your documents and generates embeddings using Cohere
3. **Vector Storage**: Embeddings are stored in Postgres with pgvector for fast similarity search
4. **Smart Search**: Users search through a clean web interface that finds semantically similar content

## 🏗️ Architecture


<img width="925" height="564" alt="Architecture diagram showing Frontend (Next.js), Backend (Express), Postgres (pgvector), Worker (Ingestion), and Cohere API components" src="https://github.com/user-attachments/assets/2d022a14-f65e-46b5-ac59-49e67491216c" />



## 🔧 Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL with pgvector extension
- Cohere API key (free from [cohere.com](https://cohere.com))

### Setup

1. **Clone and install**:

   ```bash
   git clone https://github.com/Sanjeev-Kumar78/railway-ai-search-template.git
   cd railway-ai-search-template
   ```

2. **Install dependencies**:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ../worker && npm install
   ```

3. **Environment setup**:

   ```bash
   # Create .env files in each service directory
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp worker/.env.example worker/.env
   ```

4. **Configure environment variables**:

   ```env
   # Backend & Worker .env
   DATABASE_URL=postgresql://user:pass@localhost:5432/search_db
   COHERE_API_KEY=your_cohere_api_key_here

   # Frontend .env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

5. **Setup database**:

   ```bash
   # Install pgvector extension in your PostgreSQL
   CREATE EXTENSION vector;
   ```

6. **Run services**:

   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev

   # Terminal 3 - Worker (run once to ingest docs)
   cd worker && npm start
   ```

### Local Development with Docker

For the fastest setup, use the included setup scripts:

**Manual Setup:**

```bash
# 1. Copy environment file
cp .env.docker .env

# 2. Edit .env and add your Cohere API key
# COHERE_API_KEY=your_cohere_api_key_here

# 3. Start all services with Docker Compose
docker-compose up --build

# 4. Run worker to ingest documents (in another terminal)
docker-compose run --rm worker npm start
```

This will start:

- Frontend at http://localhost:3000
- Backend API at http://localhost:3001
- PostgreSQL database with pgvector

### API Testing

Test the search API directly:

```bash
# Health check
curl http://localhost:3001/health

# Search documents
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "railway deployment", "limit": 5}'

# Get statistics
curl http://localhost:3001/api/stats
```

### Worker Usage

Run the document ingestion worker manually:

```bash
# Local development
cd worker && npm start

# Or with Docker
docker-compose run --rm worker npm start

# Or enable automatic processing in Railway
# (Set worker service to restart: always in Railway dashboard)
```

## 📁 Adding Your Documents

1. Place your documents in `worker/docs/`:

   ```
   worker/docs/
   ├── guide.md
   ├── api-reference.txt
   ├── faq.md
   └── tutorials/
       ├── getting-started.md
       └── advanced.md
   ```

2. Run the worker to process them:

   ```bash
   cd worker && npm start
   ```

3. Your documents are now searchable through the web interface!

## 🌐 API Endpoints

### Search

```bash
POST /api/search
Content-Type: application/json

{
  "query": "How do I deploy to Railway?",
  "limit": 5
}
```

### Upload Documents

```bash
POST /api/upload
Content-Type: multipart/form-data

# Upload a file
curl -X POST \
  -F "file=@document.pdf" \
  http://localhost:3001/api/upload
```

### Upload Statistics

```bash
GET /api/uploads
# Returns supported file types and upload stats
```

### Health Check

```bash
GET /api/health
```

## 🎨 Customization

### Frontend Styling

- Edit `frontend/styles/` for custom CSS
- Modify `frontend/components/` for UI changes
- Update `frontend/pages/` for new routes

### Backend Logic

- Add custom preprocessing in `backend/src/services/`
- Modify search scoring in `backend/src/controllers/search.js`


### Worker Processing

- Custom file types in `worker/src/processors/`
- Different chunking strategies in `worker/src/chunking.js`
- Batch processing in `worker/src/ingestion.js`

## 🚀 Deployment

### Railway (Recommended)

1. Connect your GitHub repo to Railway
2. Add environment variables in Railway dashboard
3. Deploy all services with one click

### Manual Docker Deploy

```bash
# Build and run each service
docker build -t search-backend ./backend
docker build -t search-frontend ./frontend
docker build -t search-worker ./worker

# Run with docker-compose
docker-compose up -d
```


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Cohere](https://cohere.com) for providing free embedding APIs
- [Railway](https://railway.app) for seamless deployment platform
- [pgvector](https://github.com/pgvector/pgvector) for PostgreSQL vector extension

---

**Why This Template is Valuable:**
This template makes semantic search accessible to anyone — no complex setup, no expensive AI tokens, and no need to run heavy ML models locally. It's ready for immediate customization, making it perfect for internal tools, or production documentation search systems.
