# Railway Cohere Docs Search - Getting Started

Welcome to your AI-powered document search system! This guide will help you get started quickly.

## What is this?

This is a semantic search engine that understands the meaning of your queries, not just keywords. It's powered by Cohere's AI and deployed on Railway.

## Quick Start

1. **Add your documents**: Place `.txt`, `.md`, or other text files in the `docs/` folder
2. **Run the ingestion**: The worker will process your documents and create embeddings
3. **Start searching**: Use the web interface to search through your documents

## How it works

1. **Document Processing**: Your documents are split into manageable chunks
2. **AI Embeddings**: Each chunk gets converted to a vector representation using Cohere
3. **Vector Storage**: Embeddings are stored in PostgreSQL with pgvector for fast search
4. **Semantic Search**: When you search, we find the most similar content by meaning

## Example Documents

Here are some example documents to help you understand how the system works:

### API Documentation

````markdown
# Authentication API

To authenticate with our API, you need to include your API key in the header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.example.com/data
```
````

The API supports both JWT tokens and API keys for authentication.

````

### Deployment Guide
```markdown
# How to Deploy on Railway

1. Connect your GitHub repository to Railway
2. Add your environment variables in the Railway dashboard
3. Click deploy and wait for the services to start
4. Your application will be available at the provided URL

Railway automatically handles SSL certificates and domain management.
````

### FAQ

```markdown
# Frequently Asked Questions

**Q: How do I reset my password?**
A: Click the "Forgot Password" link on the login page and follow the email instructions.

**Q: Can I use custom domains?**
A: Yes, you can configure custom domains in the settings panel.

**Q: Is there a rate limit?**
A: Free accounts have a limit of 1000 requests per hour.
```

## Search Examples

Try searching for:

- "How do I authenticate with the API?"
- "Railway deployment steps"
- "Password reset process"
- "Rate limiting information"

The system will find relevant content even if you don't use the exact words from the documents!

## Tips for Better Results

1. **Use natural language**: Ask questions like you would to a human
2. **Be specific**: "How to deploy on Railway" is better than just "deploy"
3. **Try variations**: If you don't find what you need, rephrase your query
4. **Check similarity scores**: Higher percentages mean more relevant results

Happy searching! 🔍
