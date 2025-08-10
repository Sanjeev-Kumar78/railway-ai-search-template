import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
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
                    threshold: 0.7
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
                                                📄 {result.source || 'Unknown source'}
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

            <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 1rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
            Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
        }

        .header {
          text-align: center;
          margin: 2rem 0;
          color: white;
        }

        .title {
          margin: 0;
          font-size: 3rem;
          font-weight: 600;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .subtitle {
          margin: 0.5rem 0 0 0;
          font-size: 1.2rem;
          opacity: 0.9;
        }

        .stats {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.2);
          border-radius: 20px;
          display: inline-block;
          backdrop-filter: blur(10px);
        }

        .main {
          flex: 1;
          width: 100%;
          max-width: 800px;
        }

        .search-form {
          margin-bottom: 2rem;
        }

        .search-container {
          display: flex;
          gap: 0.5rem;
          background: white;
          border-radius: 50px;
          padding: 0.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 1rem 1.5rem;
          font-size: 1.1rem;
          border-radius: 40px;
          background: transparent;
        }

        .search-input::placeholder {
          color: #999;
        }

        .search-button {
          background: #667eea;
          color: white;
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-button:hover:not(:disabled) {
          background: #5a6fd8;
          transform: scale(1.05);
        }

        .search-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error {
          background: #fee;
          color: #c33;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border-left: 4px solid #c33;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: white;
        }

        .spinner {
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top: 3px solid white;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .results {
          margin-top: 2rem;
        }

        .results-title {
          color: white;
          margin-bottom: 1rem;
          font-size: 1.3rem;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .result-item {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.2s ease;
        }

        .result-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .result-source {
          color: #666;
          font-weight: 500;
        }

        .result-similarity {
          background: #e8f4fd;
          color: #0066cc;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .result-content {
          line-height: 1.6;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .result-content :global(mark) {
          background: #ffeb3b;
          padding: 0.1rem 0.2rem;
          border-radius: 3px;
          font-weight: 600;
        }

        .result-meta {
          color: #999;
          font-size: 0.8rem;
          font-style: italic;
        }

        .no-results {
          text-align: center;
          color: white;
          padding: 2rem;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .welcome {
          text-align: center;
          color: white;
          padding: 2rem;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .welcome h2 {
          margin-bottom: 1rem;
        }

        .examples {
          margin-top: 2rem;
          text-align: left;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        .examples h3 {
          margin-bottom: 1rem;
          text-align: center;
        }

        .examples ul {
          list-style: none;
          padding: 0;
        }

        .examples li {
          padding: 0.5rem 0;
          padding-left: 1.5rem;
          position: relative;
        }

        .examples li:before {
          content: "💡";
          position: absolute;
          left: 0;
        }

        .footer {
          color: white;
          text-align: center;
          padding: 2rem 0;
          opacity: 0.8;
        }

        .footer a {
          color: white;
          text-decoration: underline;
        }

        /* Upload Section Styles */
        .upload-toggle {
          margin-top: 1rem;
        }

        .toggle-button {
          background: rgba(255,255,255,0.2);
          color: white;
          border: 2px solid rgba(255,255,255,0.3);
          padding: 0.7rem 1.5rem;
          border-radius: 25px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .toggle-button:hover {
          background: rgba(255,255,255,0.3);
          border-color: rgba(255,255,255,0.5);
          transform: translateY(-2px);
        }

        .upload-section {
          width: 100%;
          max-width: 600px;
          background: white;
          border-radius: 15px;
          padding: 2rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          margin-bottom: 2rem;
        }

        .upload-section h2 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-size: 1.5rem;
        }

        .upload-description {
          color: #666;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .upload-form {
          margin-bottom: 1.5rem;
        }

        .file-input-container {
          margin-bottom: 1rem;
        }

        .file-input {
          display: none;
        }

        .file-label {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          border: none;
          font-size: 1rem;
        }

        .file-label:hover {
          background: #5a6fd8;
          transform: translateY(-2px);
        }

        .file-info {
          margin-top: 0.8rem;
          padding: 0.8rem;
          background: #f8f9fa;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .file-name {
          font-weight: 500;
          color: #333;
        }

        .file-size {
          color: #666;
          font-size: 0.9rem;
        }

        .upload-button {
          width: 100%;
          background: #28a745;
          color: white;
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .upload-button:hover:not(:disabled) {
          background: #218838;
          transform: translateY(-2px);
        }

        .upload-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
          transform: none;
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 0.8rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #c3e6cb;
        }

        .upload-info {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .upload-info h3 {
          margin: 0 0 0.8rem 0;
          color: #333;
          font-size: 1.1rem;
        }

        .upload-info ul {
          margin: 0 0 1rem 0;
          padding-left: 1.5rem;
        }

        .upload-info li {
          margin-bottom: 0.3rem;
          color: #555;
        }

        .search-section {
          width: 100%;
          max-width: 600px;
        }

        @media (max-width: 768px) {
          .title {
            font-size: 2rem;
          }
          
          .subtitle {
            font-size: 1rem;
          }
          
          .container {
            padding: 0 0.5rem;
          }
          
          .search-input {
            font-size: 1rem;
            padding: 0.8rem 1rem;
          }
          
          .result-header {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }
        }
      `}</style>
        </>
    );
}
