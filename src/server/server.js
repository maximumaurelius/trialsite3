const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Configuration
const config = {
    distDir: path.join(__dirname, '../../dist')
};

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

// Handle main routes first
app.get('/', (req, res) => sendFileWithErrorHandling(res, path.join(config.distDir, 'index.html')));
app.get('/blog.html', (req, res) => sendFileWithErrorHandling(res, path.join(config.distDir, 'blog.html')));
app.get('/about.html', (req, res) => sendFileWithErrorHandling(res, path.join(config.distDir, 'about.html')));

// Handle posts/index.json before the :slug route
app.get('/posts/index.json', (req, res) => sendFileWithErrorHandling(res, path.join(config.distDir, 'posts/index.json'), 'Error loading posts'));
app.get('/posts/:slug.html', (req, res) => sendFileWithErrorHandling(res, path.join(config.distDir, 'posts', `${req.params.slug}.html`), 'Post not found'));

// Serve static assets
app.use('/css', express.static(path.join(config.distDir, 'css'), staticOptions));
app.use('/js', express.static(path.join(config.distDir, 'js'), staticOptions));

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

// Start server
const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Static files being served from:', config.distDir);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
}); 