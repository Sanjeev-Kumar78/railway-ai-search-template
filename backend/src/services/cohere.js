const { CohereClient } = require('cohere-ai');

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY
});

async function generateEmbedding(text) {
    try {
        const response = await cohere.embed({
            texts: [text],
            model: 'embed-english-v3.0',
            inputType: 'search_query'
        });

        return response.embeddings[0];
    } catch (error) {
        console.error('❌ Cohere embedding error:', error);
        throw new Error('Failed to generate embedding');
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
        console.error('❌ Cohere batch embedding error:', error);
        throw new Error('Failed to generate embeddings');
    }
}

module.exports = {
    generateEmbedding,
    generateEmbeddings
};
