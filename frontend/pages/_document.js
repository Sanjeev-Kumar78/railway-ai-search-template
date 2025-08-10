import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <meta charSet="utf-8" />
                <link rel="icon" href="/favicon.ico" />
                <meta name="theme-color" content="#667eea" />
                <meta name="description" content="AI-powered semantic search for your documents using Cohere and Railway" />
                <meta property="og:title" content="Railway Cohere Docs Search" />
                <meta property="og:description" content="AI-powered semantic search for your documents" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content="Railway Cohere Docs Search" />
                <meta name="twitter:description" content="AI-powered semantic search for your documents" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
