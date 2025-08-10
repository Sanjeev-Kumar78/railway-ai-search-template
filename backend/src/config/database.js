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

async function searchSimilarDocuments(queryEmbedding, limit = 5, threshold = 0.3) {
    const client = await pool.connect();
    try {
        console.log(`🔍 Search params: limit=${limit}, similarity_threshold=${threshold}`);

        // First, let's see all documents without any filtering
        const allDocsQuery = `SELECT id, content, source_file, chunk_index FROM documents LIMIT 5`;
        const allDocs = await client.query(allDocsQuery);
        console.log(`📄 Total documents in DB: ${allDocs.rows.length}`);
        if (allDocs.rows.length > 0) {
            console.log(`📄 Sample document: ${allDocs.rows[0].content.substring(0, 100)}...`);
        }

        const query = `
      SELECT 
        id,
        content,
        metadata,
        source_file,
        chunk_index,
        1 - cosine_distance(embedding, $1::vector) AS similarity
      FROM documents 
      WHERE 1 - cosine_distance(embedding, $1::vector) > $2
      ORDER BY similarity DESC
      LIMIT $3
    `;
        const values = [`[${queryEmbedding.join(',')}]`, threshold, limit];

        const result = await client.query(query, values);

        console.log(`🔍 Query returned ${result.rows.length} rows`);
        if (result.rows.length > 0) {
            console.log(`🔍 Best match: similarity=${result.rows[0].similarity}`);
            console.log(`🔍 Content preview: ${result.rows[0].content.substring(0, 100)}...`);
        }

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

async function insertDocument({ content, embedding, metadata = {}, source_file, chunk_index = 0 }) {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO documents (content, embedding, metadata, source_file, chunk_index)
            VALUES ($1, $2::vector, $3, $4, $5)
            RETURNING id
        `;

        const result = await client.query(query, [
            content,
            `[${embedding.join(',')}]`,
            JSON.stringify(metadata),
            source_file,
            chunk_index
        ]);

        return result.rows[0];
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    initializeDatabase,
    searchSimilarDocuments,
    getDocumentCount,
    insertDocument
};
