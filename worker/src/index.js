require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { CohereClient } = require('cohere-ai');

// Configuration
const DOCS_DIR = path.join(__dirname, '../docs');
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 10;
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 1000;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 200;
const SKIP_EXISTING = process.env.SKIP_EXISTING === 'true';
const VERBOSE = process.env.VERBOSE === 'true';

// Initialize clients
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY
});

// Utility functions
function log(message, level = 'info') {
    if (VERBOSE || level === 'error') {
        const timestamp = new Date().toISOString();
        const emoji = level === 'error' ? '❌' : level === 'success' ? '✅' : 'ℹ️';
        console.log(`${emoji} [${timestamp}] ${message}`);
    }
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        let chunk = text.slice(start, end);

        // Try to break at sentence boundaries
        if (end < text.length) {
            const lastSentence = chunk.lastIndexOf('.');
            const lastNewline = chunk.lastIndexOf('\n');
            const breakPoint = Math.max(lastSentence, lastNewline);

            if (breakPoint > start + chunkSize * 0.5) {
                chunk = text.slice(start, breakPoint + 1);
                start = breakPoint + 1 - overlap;
            } else {
                start = end - overlap;
            }
        } else {
            start = end;
        }

        chunks.push(chunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
}

function isSupportedFile(filename) {
    const supportedExtensions = ['.txt', '.md', '.markdown', '.rst', '.tex'];
    return supportedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

async function readFilesRecursively(dir) {
    const files = [];

    if (!fs.existsSync(dir)) {
        log(`Documents directory not found: ${dir}`, 'error');
        return files;
    }

    function readDir(currentDir) {
        const entries = fs.readdirSync(currentDir);

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                readDir(fullPath);
            } else if (stat.isFile() && isSupportedFile(entry)) {
                files.push(fullPath);
            }
        }
    }

    readDir(dir);
    return files;
}

async function initializeDatabase() {
    const client = await pool.connect();
    try {
        // Enable pgvector extension
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');

        // Create documents table if it doesn't exist
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

        log('Database initialized successfully', 'success');
    } finally {
        client.release();
    }
}

async function fileAlreadyProcessed(filePath) {
    if (!SKIP_EXISTING) return false;

    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT COUNT(*) as count FROM documents WHERE source_file = $1',
            [filePath]
        );
        return parseInt(result.rows[0].count) > 0;
    } finally {
        client.release();
    }
}

async function generateEmbeddings(texts) {
    try {
        const response = await cohere.embed({
            texts,
            model: 'embed-english-v3.0',
            inputType: 'search_document'
        });

        return response.embeddings;
    } catch (error) {
        log(`Cohere embedding error: ${error.message}`, 'error');
        throw error;
    }
}

async function insertDocuments(documents) {
    const client = await pool.connect();
    try {
        const values = [];
        const placeholders = [];

        documents.forEach((doc, index) => {
            const baseIndex = index * 6;
            placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`);
            values.push(
                doc.content,
                JSON.stringify(doc.metadata),
                `[${doc.embedding.join(',')}]`,
                doc.source_file,
                doc.chunk_index,
                new Date()
            );
        });

        const query = `
      INSERT INTO documents (content, metadata, embedding, source_file, chunk_index, created_at)
      VALUES ${placeholders.join(', ')}
    `;

        await client.query(query, values);
        log(`Inserted ${documents.length} document chunks`, 'success');
    } finally {
        client.release();
    }
}

async function processFile(filePath) {
    try {
        log(`Processing file: ${filePath}`);

        // Check if file was already processed
        if (await fileAlreadyProcessed(filePath)) {
            log(`Skipping already processed file: ${filePath}`);
            return;
        }

        // Read file content
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!content.trim()) {
            log(`Skipping empty file: ${filePath}`);
            return;
        }

        // Chunk the content
        const chunks = chunkText(content);
        log(`Created ${chunks.length} chunks from ${filePath}`);

        // Process chunks in batches
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);

            log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} for ${path.basename(filePath)}`);

            // Generate embeddings for the batch
            const embeddings = await generateEmbeddings(batch);

            // Prepare documents for insertion
            const documents = batch.map((chunk, index) => ({
                content: chunk,
                metadata: {
                    file_size: content.length,
                    chunk_size: chunk.length,
                    processed_at: new Date().toISOString()
                },
                embedding: embeddings[index],
                source_file: path.relative(DOCS_DIR, filePath),
                chunk_index: i + index
            }));

            // Insert documents
            await insertDocuments(documents);

            // Add a small delay to avoid rate limiting
            if (i + BATCH_SIZE < chunks.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        log(`Successfully processed ${filePath}`, 'success');
    } catch (error) {
        log(`Error processing file ${filePath}: ${error.message}`, 'error');
        throw error;
    }
}

async function processAllFiles() {
    try {
        log('Starting document ingestion process');

        // Initialize database
        await initializeDatabase();

        // Find all supported files
        const files = await readFilesRecursively(DOCS_DIR);

        if (files.length === 0) {
            log('No supported documents found in docs directory');
            log('Supported formats: .txt, .md, .markdown, .rst, .tex');
            log(`Place your documents in: ${DOCS_DIR}`);
            return;
        }

        log(`Found ${files.length} document(s) to process`);

        // Process each file
        let processed = 0;
        let skipped = 0;
        let errors = 0;

        for (const file of files) {
            try {
                const wasAlreadyProcessed = await fileAlreadyProcessed(file);
                if (wasAlreadyProcessed) {
                    skipped++;
                } else {
                    await processFile(file);
                    processed++;
                }
            } catch (error) {
                errors++;
                log(`Failed to process ${file}: ${error.message}`, 'error');
            }
        }

        // Summary
        log('='.repeat(50));
        log('Ingestion complete!', 'success');
        log(`Files processed: ${processed}`);
        log(`Files skipped: ${skipped}`);
        log(`Errors: ${errors}`);
        log('='.repeat(50));

        if (processed > 0) {
            log('Your documents are now searchable! 🎉', 'success');
        }

    } catch (error) {
        log(`Fatal error during ingestion: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Run the ingestion process
if (require.main === module) {
    processAllFiles()
        .then(() => {
            log('Ingestion process completed');
            process.exit(0);
        })
        .catch((error) => {
            log(`Ingestion failed: ${error.message}`, 'error');
            process.exit(1);
        });
}

module.exports = {
    processAllFiles,
    processFile,
    chunkText,
    initializeDatabase
};
