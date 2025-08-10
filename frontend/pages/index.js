import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const raw_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = raw_API_URL.startsWith('https://') ? raw_API_URL : `https://${raw_API_URL}`;

export default function Home() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [threshold, setThreshold] = useState(0.3);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const searchInputRef = useRef(null);

    // Fetch stats on component mount
    useEffect(() => {
        fetchStats();
    }, []);

    // Focus search input on page load
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_URL}/api/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!query.trim()) {
            setError('Please enter a search query');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query.trim(),
                    limit: 10,
                    threshold: threshold
                }),
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json();
            setResults(data.results || []);

            if (data.results?.length === 0) {
                setError('No results found. Try a different search query.');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError(err.message || 'Search failed. Please try again.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();

        if (!uploadFile) {
            setUploadError('Please select a file to upload');
            return;
        }

        setUploadLoading(true);
        setUploadError(null);
        setUploadSuccess(null);

        try {
            const formData = new FormData();
            formData.append('file', uploadFile);

            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            setUploadSuccess(`File uploaded successfully! Processed ${data.processing.processedChunks}/${data.processing.totalChunks} chunks.`);
            setUploadFile(null);

            // Reset file input
            const fileInput = document.getElementById('file-upload');
            if (fileInput) fileInput.value = '';

            // Refresh stats
            fetchStats();

        } catch (err) {
            console.error('Upload error:', err);
            setUploadError(err.message || 'Upload failed. Please try again.');
        } finally {
            setUploadLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        setUploadFile(file);
        setUploadError(null);
        setUploadSuccess(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const highlightQuery = (text, query) => {
        if (!query.trim()) return text;

        const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };

    return (
        <>
            <Head>
                <title>Railway Cohere Docs Search</title>
                <meta name="description" content="AI-powered semantic search for your documents" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="container">
                <header className="header">
                    <h1 className="title">
                        🔍 Railway Cohere Docs Search
                    </h1>
                    <p className="subtitle">
                        AI-powered semantic search for your documents
                    </p>
                    {stats && (
                        <div className="stats">
                            📊 {stats.documents} documents indexed
                        </div>
                    )}

                    <div className="upload-toggle">
                        <button
                            type="button"
                            onClick={() => setShowUpload(!showUpload)}
                            className="toggle-button"
                        >
                            {showUpload ? '🔍 Search Documents' : '📁 Upload Documents'}
                        </button>
                    </div>
                </header>

                <main className="main">
                    {showUpload ? (
                        // Upload Section
                        <div className="upload-section">
                            <h2>Upload Documents</h2>
                            <p className="upload-description">
                                Upload text files, PDFs, or Markdown documents to add them to the search index.
                            </p>

                            <form onSubmit={handleFileUpload} className="upload-form">
                                <div className="file-input-container">
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept=".txt,.md,.pdf,.doc,.docx"
                                        onChange={handleFileSelect}
                                        className="file-input"
                                    />
                                    <label htmlFor="file-upload" className="file-label">
                                        📎 Choose File
                                    </label>
                                    {uploadFile && (
                                        <div className="file-info">
                                            <span className="file-name">{uploadFile.name}</span>
                                            <span className="file-size">({formatFileSize(uploadFile.size)})</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={!uploadFile || uploadLoading}
                                    className="upload-button"
                                >
                                    {uploadLoading ? '⏳ Processing...' : '🚀 Upload & Index'}
                                </button>
                            </form>

                            {uploadError && (
                                <div className="error-message">
                                    ❌ {uploadError}
                                </div>
                            )}

                            {uploadSuccess && (
                                <div className="success-message">
                                    ✅ {uploadSuccess}
                                </div>
                            )}

                            <div className="upload-info">
                                <h3>Supported File Types:</h3>
                                <ul>
                                    <li>📄 Text files (.txt)</li>
                                    <li>📝 Markdown files (.md)</li>
                                    <li>📕 PDF files (.pdf)</li>
                                    <li>📘 Word documents (.doc, .docx)</li>
                                </ul>
                                <p><strong>Maximum file size:</strong> 10MB</p>
                            </div>
                        </div>
                    ) : (
                        // Search Section
                        <div className="search-section">
                            <form onSubmit={handleSearch} className="search-form">
                                <div className="search-container">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search your documents... (e.g., 'How to deploy on Railway?')"
                                        className="search-input"
                                        disabled={loading}
                                    />
                                    <button
                                        type="submit"
                                        className="search-button"
                                        disabled={loading || !query.trim()}
                                    >
                                        {loading ? '🔄' : '🔍'}
                                    </button>
                                </div>

                                <div className="threshold-container">
                                    <label htmlFor="threshold-slider" className="threshold-label">
                                        Similarity Threshold: {(threshold * 100).toFixed(0)}%
                                    </label>
                                    <input
                                        id="threshold-slider"
                                        type="range"
                                        min="0.1"
                                        max="0.9"
                                        step="0.05"
                                        value={threshold}
                                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                        className="threshold-slider"
                                    />
                                    <div className="threshold-labels">
                                        <span>More Results</span>
                                        <span>More Precise</span>
                                    </div>
                                </div>
                            </form>

                            {error && (
                                <div className="error">
                                    ⚠️ {error}
                                </div>
                            )}

                            {loading && (
                                <div className="loading">
                                    <div className="spinner"></div>
                                    <p>Searching your documents...</p>
                                </div>
                            )}

                            {results.length > 0 && !loading && (
                                <div className="results">
                                    <h2 className="results-title">
                                        Found {results.length} relevant document{results.length !== 1 ? 's' : ''}
                                    </h2>
                                    <div className="results-list">
                                        {results.map((result) => (
                                            <div key={result.id} className="result-item">
                                                <div className="result-header">
                                                    <span className="result-source">
                                                        📄 {result.source_file || 'Unknown source'}
                                                    </span>
                                                    <span className="result-similarity">
                                                        {Math.round(result.similarity * 100)}% match
                                                    </span>
                                                </div>
                                                <div
                                                    className="result-content"
                                                    dangerouslySetInnerHTML={{
                                                        __html: highlightQuery(result.content, query)
                                                    }}
                                                />
                                                {result.chunk > 0 && (
                                                    <div className="result-meta">
                                                        Chunk {result.chunk + 1}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!loading && !error && results.length === 0 && query.trim() && (
                                <div className="no-results">
                                    <p>🤔 No results found for "{query}"</p>
                                    <p>Try using different keywords or phrases.</p>
                                </div>
                            )}

                            {!loading && !query.trim() && results.length === 0 && (
                                <div className="welcome">
                                    <h2>Welcome to your AI-powered search!</h2>
                                    <p>Enter a question or topic above to find relevant information from your documents.</p>
                                    <div className="examples">
                                        <h3>Try searching for:</h3>
                                        <ul>
                                            <li>"How do I deploy my app?"</li>
                                            <li>"Database configuration"</li>
                                            <li>"API authentication"</li>
                                            <li>"Environment variables"</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                <footer className="footer">
                    <p>
                        Powered by{' '}
                        <a href="https://cohere.com" target="_blank" rel="noopener noreferrer">
                            Cohere
                        </a>{' '}
                        and{' '}
                        <a href="https://railway.app" target="_blank" rel="noopener noreferrer">
                            Railway
                        </a>
                    </p>
                </footer>
            </div>
        </>
    );
}
