const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { generateEmbedding } = require('../services/cohere');
const { insertDocument, getDocumentCount } = require('../config/database');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow text files, PDFs, and markdown files
        const allowedTypes = [
            'text/plain',
            'text/markdown',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const allowedExtensions = ['.txt', '.md', '.pdf', '.doc', '.docx'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Please upload .txt, .md, or .pdf files.'));
        }
    }
});

// Helper function to chunk text
function chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;

        // If this isn't the last chunk, try to break at a sentence or paragraph
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewline = text.lastIndexOf('\n', end);
            const breakPoint = Math.max(lastPeriod, lastNewline);

            if (breakPoint > start + chunkSize * 0.5) {
                end = breakPoint + 1;
            }
        }

        const chunk = text.slice(start, end).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        start = end - overlap;
    }

    return chunks;
}

// Helper function to extract text from different file types
async function extractTextFromFile(file) {
    const extension = path.extname(file.originalname).toLowerCase();

    try {
        switch (extension) {
            case '.pdf':
                const pdfData = await pdfParse(file.buffer);
                return pdfData.text;

            case '.txt':
            case '.md':
                return file.buffer.toString('utf-8');

            default:
                // For other text-based files, try to decode as UTF-8
                return file.buffer.toString('utf-8');
        }
    } catch (error) {
        throw new Error(`Failed to extract text from ${extension} file: ${error.message}`);
    }
}

// POST /api/upload - Upload and process documents
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded'
            });
        }

        const file = req.file;
        const fileName = file.originalname;

        console.log(`📁 Processing uploaded file: ${fileName}`);

        // Extract text from the file
        const text = await extractTextFromFile(file);

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                error: 'No text content found in the uploaded file'
            });
        }

        console.log(`📄 Extracted ${text.length} characters from ${fileName}`);

        // Chunk the text
        const chunkSize = parseInt(process.env.CHUNK_SIZE) || 1000;
        const chunkOverlap = parseInt(process.env.CHUNK_OVERLAP) || 200;
        const chunks = chunkText(text, chunkSize, chunkOverlap);

        console.log(`🔪 Split into ${chunks.length} chunks`);

        // Process chunks in batches
        const batchSize = parseInt(process.env.BATCH_SIZE) || 5;
        let processedChunks = 0;
        let errors = [];

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);

            // Process batch in parallel
            const batchPromises = batch.map(async (chunk, batchIndex) => {
                try {
                    const globalIndex = i + batchIndex;

                    // Generate embedding
                    const embedding = await generateEmbedding(chunk);

                    // Insert into database
                    await insertDocument({
                        content: chunk,
                        embedding: embedding,
                        metadata: {
                            source: 'upload',
                            filename: fileName,
                            uploadedAt: new Date().toISOString(),
                            fileSize: file.size,
                            mimeType: file.mimetype
                        },
                        source_file: fileName,
                        chunk_index: globalIndex
                    });

                    processedChunks++;

                    if (process.env.VERBOSE === 'true') {
                        console.log(`✅ Processed chunk ${globalIndex + 1}/${chunks.length}`);
                    }
                } catch (error) {
                    console.error(`❌ Error processing chunk ${globalIndex + 1}:`, error.message);
                    errors.push(`Chunk ${globalIndex + 1}: ${error.message}`);
                }
            });

            await Promise.all(batchPromises);

            // Small delay between batches to avoid rate limiting
            if (i + batchSize < chunks.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`🎉 Upload complete: ${processedChunks}/${chunks.length} chunks processed`);

        // Get updated document count
        const totalDocuments = await getDocumentCount();

        res.json({
            success: true,
            message: `File uploaded and processed successfully`,
            file: {
                name: fileName,
                size: file.size,
                type: file.mimetype
            },
            processing: {
                totalChunks: chunks.length,
                processedChunks: processedChunks,
                errors: errors.length,
                errorDetails: errors.length > 0 ? errors.slice(0, 5) : undefined // Limit error details
            },
            database: {
                totalDocuments: totalDocuments
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/uploads - Get upload history/stats
router.get('/uploads', async (req, res) => {
    try {
        // This would require a separate uploads table in a real app
        // For now, return basic stats
        const totalDocuments = await getDocumentCount();

        res.json({
            totalDocuments: totalDocuments,
            supportedFormats: ['.txt', '.md', '.pdf'],
            maxFileSize: '10MB',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Upload stats error:', error);
        res.status(500).json({
            error: 'Failed to get upload statistics',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
