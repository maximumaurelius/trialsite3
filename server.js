const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Disable caching for development
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Helper function to send files with proper error handling
const sendFileWithErrorHandling = (res, filePath, errorMessage = 'File not found') => {
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error serving ${filePath}:`, err);
            if (err.code === 'ENOENT') {
                res.status(404).send(errorMessage);
            } else {
                res.status(500).send('Internal server error');
            }
        }
    });
};

// Handle posts/index.json first
app.get('/posts/index.json', (req, res) => {
    const filePath = path.join(__dirname, 'dist/posts/index.json');
    sendFileWithErrorHandling(res, filePath, 'Error loading posts');
});

// Handle blog posts
app.get('/posts/:slug.html', (req, res) => {
    const filePath = path.join(__dirname, 'dist', 'posts', `${req.params.slug}.html`);
    sendFileWithErrorHandling(res, filePath, 'Post not found');
});

// Serve static files with proper caching headers
const staticOptions = {
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.set('Cache-Control', 'no-cache');
        } else {
            res.set('Cache-Control', 'public, max-age=31536000'); // 1 year for static assets
        }
    }
};

app.use('/css', express.static(path.join(__dirname, 'dist/css'), staticOptions));
app.use('/js', express.static(path.join(__dirname, 'dist/js'), staticOptions));

// Handle main HTML pages
const sendHtml = (fileName) => (req, res) => {
    const filePath = path.join(__dirname, 'dist', fileName);
    sendFileWithErrorHandling(res, filePath);
};

app.get('/', sendHtml('index.html'));
app.get('/index.html', sendHtml('index.html'));
app.get('/blog.html', sendHtml('blog.html'));

// Handle 404s with a custom 404 page
app.use((req, res) => {
    console.log('404 - Not Found:', req.url);
    res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 - Page Not Found</title>
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
            <header>
                <nav>
                    <div class="nav-container">
                        <a href="/" class="logo">My Blog</a>
                        <ul class="nav-links">
                            <li><a href="/">Home</a></li>
                            <li><a href="/blog.html">Blog</a></li>
                        </ul>
                    </div>
                </nav>
            </header>
            <main>
                <section class="hero">
                    <h1>404 - Page Not Found</h1>
                    <p>Sorry, the page you're looking for doesn't exist.</p>
                    <p><a href="/">Return to Home</a></p>
                </section>
            </main>
            <footer>
                <p>&copy; 2024 My Blog. All rights reserved.</p>
            </footer>
        </body>
        </html>
    `);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Something broke!');
});

// Function to find an available port
const findAvailablePort = (startPort) => {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        server.listen(startPort, () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            resolve(findAvailablePort(startPort + 1));
        });
    });
};

// Start server with automatic port finding
findAvailablePort(port).then(availablePort => {
    const server = app.listen(availablePort, () => {
        console.log(`Server running at http://localhost:${availablePort}`);
        console.log('Static files being served from:', path.join(__dirname, 'dist'));
    });

    // Handle server shutdown gracefully
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM. Performing graceful shutdown...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
}); 