const { CohereClient } = require('cohere-ai');

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY
});

async function withRetries(fn, retries = 3, delay = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
        }
    }
}

async function generateEmbedding(text) {
    try {
        const response = await withRetries(() => cohere.embed({
            texts: [text],
            model: 'embed-english-v3.0',
            inputType: 'search_query'
        }));

        const vec = response.embeddings[0];
        console.log('DEBUG: embedding length =', vec.length);
        if (vec.length !== 1024) {
            console.warn('Warning: embedding length is', vec.length, 'expected 1024 — update DB column if needed.');
        }
        return vec;
    } catch (error) {
        console.error('❌ Cohere embedding error:', error);
        throw new Error('Failed to generate embedding');
    }
}

async function generateEmbeddings(texts) {
    try {
        const response = await withRetries(() => cohere.embed({
            texts,
            model: 'embed-english-v3.0',
            inputType: 'search_document'
        }));

        const embeddings = response.embeddings;
        console.log('DEBUG: batch embedding lengths =', embeddings.map(e => e.length));
        if (embeddings.length > 0 && embeddings[0].length !== 1024) {
            console.warn('Warning: embedding length is', embeddings[0].length, 'expected 1024 — update DB column if needed.');
        }
        return embeddings;
    } catch (error) {
        console.error('❌ Cohere batch embedding error:', error);
        throw new Error('Failed to generate embeddings');
    }
}

module.exports = {
    generateEmbedding,
    generateEmbeddings
};
