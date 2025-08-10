const express = require('express');
const { generateEmbedding } = require('../services/cohere');
const { searchSimilarDocuments, getDocumentCount } = require('../config/database');

const router = express.Router();

// POST /api/search - Semantic search endpoint
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5, threshold = 0.7 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Query is required and must be a string' 
      });
    }
    
    if (query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Query cannot be empty' 
      });
    }
    
    console.log(`🔍 Searching for: "${query}"`);
    
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for similar documents
    const results = await searchSimilarDocuments(
      queryEmbedding, 
      Math.min(parseInt(limit) || 5, 20), // Cap at 20 results
      Math.max(parseFloat(threshold) || 0.7, 0.5) // Min threshold of 0.5
    );
    
    console.log(`📊 Found ${results.length} similar documents`);
    
    res.json({
      query,
      results: results.map(doc => ({
        id: doc.id,
        content: doc.content,
        similarity: parseFloat(doc.similarity),
        source: doc.source_file,
        chunk: doc.chunk_index,
        metadata: doc.metadata
      })),
      count: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/stats - Get database statistics
router.get('/stats', async (req, res) => {
  try {
    const documentCount = await getDocumentCount();
    
    res.json({
      documents: documentCount,
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/health - Health check for API
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'search-api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
