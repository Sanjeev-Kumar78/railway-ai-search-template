# API Reference

## Overview

This document provides a comprehensive reference for the Railway Cohere Search API. The API allows you to perform semantic search operations on your indexed documents.

## Base URL

```
https://your-app.railway.app/api
```

For local development:

```
http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication. In production environments, you should implement proper authentication mechanisms.

## Endpoints

### Search Documents

Perform semantic search across your document collection.

**Endpoint:** `POST /search`

**Request Body:**

```json
{
  "query": "string (required) - The search query",
  "limit": "number (optional) - Maximum results to return (default: 5, max: 20)",
  "threshold": "number (optional) - Similarity threshold (default: 0.7, min: 0.5)"
}
```

**Response:**

```json
{
  "query": "How to deploy on Railway?",
  "results": [
    {
      "id": 123,
      "content": "To deploy on Railway, you need to...",
      "similarity": 0.89,
      "source": "deployment-guide.md",
      "chunk": 2,
      "metadata": {
        "file_size": 5420,
        "chunk_size": 850,
        "processed_at": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "count": 1,
  "timestamp": "2024-01-15T14:25:30Z"
}
```

**Example Request:**

```bash
curl -X POST https://your-app.railway.app/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I set up environment variables?",
    "limit": 5,
    "threshold": 0.8
  }'
```

**Error Responses:**

```json
{
  "error": "Query is required and must be a string"
}
```

### Get Statistics

Retrieve information about the indexed document collection.

**Endpoint:** `GET /stats`

**Response:**

```json
{
  "documents": 142,
  "status": "healthy",
  "timestamp": "2024-01-15T14:25:30Z"
}
```

**Example Request:**

```bash
curl https://your-app.railway.app/api/stats
```

### Health Check

Check if the API service is running properly.

**Endpoint:** `GET /health`

**Response:**

```json
{
  "status": "healthy",
  "service": "search-api",
  "timestamp": "2024-01-15T14:25:30Z",
  "environment": "production"
}
```

## Query Tips

### Effective Search Queries

**Good Queries:**

- "How do I deploy my application?"
- "Environment variable configuration"
- "Database connection setup"
- "Authentication with API keys"

**Less Effective:**

- Single words like "deploy" or "config"
- Very short phrases
- Queries with only special characters

### Understanding Similarity Scores

- **0.9-1.0**: Excellent match, highly relevant
- **0.8-0.9**: Good match, very relevant
- **0.7-0.8**: Decent match, somewhat relevant
- **0.6-0.7**: Weak match, possibly relevant
- **Below 0.6**: Poor match, likely not relevant

## Error Handling

### Common Error Codes

**400 Bad Request**

- Missing or invalid query parameter
- Invalid limit or threshold values

**500 Internal Server Error**

- Database connection issues
- Cohere API errors
- Processing failures

### Error Response Format

```json
{
  "error": "Description of the error",
  "message": "Detailed error message (development mode only)"
}
```

## Rate Limiting

Currently, there are no rate limits implemented. In production, consider implementing:

- Rate limiting per IP address
- Authentication-based quotas
- Request throttling during high load

## SDKs and Libraries

### JavaScript/Node.js

```javascript
const response = await fetch("/api/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "How to use the API?",
    limit: 5,
  }),
});

const data = await response.json();
console.log(data.results);
```

### Python

```python
import requests

response = requests.post('/api/search', json={
    'query': 'How to use the API?',
    'limit': 5
})

data = response.json()
print(data['results'])
```

### cURL

```bash
# Basic search
curl -X POST /api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "API usage examples"}'

# Advanced search with parameters
curl -X POST /api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "deployment guide", "limit": 10, "threshold": 0.8}'
```

## Metadata Fields

Each search result includes metadata about the source document:

- **file_size**: Size of the original document in bytes
- **chunk_size**: Size of this specific chunk in characters
- **processed_at**: When the document was processed and indexed
- **source**: Relative path to the source file
- **chunk**: Index of this chunk within the source document

## Performance Considerations

### Optimization Tips

1. **Query Length**: Longer, more specific queries generally yield better results
2. **Batch Requests**: For multiple queries, consider batching them
3. **Caching**: Implement client-side caching for repeated queries
4. **Pagination**: Use appropriate limit values to balance performance and completeness

### Response Times

Typical response times:

- Simple queries: 100-300ms
- Complex queries: 300-800ms
- Large result sets: 500-1000ms

Times may vary based on:

- Database size
- Query complexity
- Server load
- Network latency

## Troubleshooting

### Common Issues

**No Results Returned**

- Try broader search terms
- Lower the similarity threshold
- Check if documents were properly indexed

**Slow Response Times**

- Verify database performance
- Check Cohere API status
- Monitor server resources

**Unexpected Results**

- Review document content and chunking
- Adjust similarity threshold
- Try different query phrasings

### Debug Information

In development mode, additional debug information is available:

- Detailed error messages
- Processing timestamps
- Query analysis results
