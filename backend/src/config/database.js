const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
    const client = await pool.connect();
    try {
        // Enable pgvector extension
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');

        // Create documents table with vector column
        await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        embedding vector(1024),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source_file TEXT,
        chunk_index INTEGER DEFAULT 0
      )
    `);

        // Create index for vector similarity search
        await client.query(`
      CREATE INDEX IF NOT EXISTS documents_embedding_idx 
      ON documents USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100)
    `);

        console.log('✅ Database tables and indexes created successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function searchSimilarDocuments(queryEmbedding, limit = 5, threshold = 0.7) {
    const client = await pool.connect();
    try {
        const query = `
      SELECT 
        id,
        content,
        metadata,
        source_file,
        chunk_index,
        cosine_similarity(embedding, $1::vector) AS similarity
      FROM documents 
      WHERE cosine_similarity(embedding, $1::vector) > $2
      ORDER BY similarity DESC
      LIMIT $3
    `;

        const result = await client.query(query, [
            `[${queryEmbedding.join(',')}]`,
            threshold,
            limit
        ]);

        return result.rows;
    } finally {
        client.release();
    }
}

async function getDocumentCount() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT COUNT(*) as count FROM documents');
        return parseInt(result.rows[0].count);
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    initializeDatabase,
    searchSimilarDocuments,
    getDocumentCount
};
