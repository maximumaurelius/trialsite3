const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');

// Configuration
const config = {
    postsDir: path.join(__dirname, '../content/posts'),
    pagesDir: path.join(__dirname, '../content/pages'),
    outputDir: path.join(__dirname, '../../dist'),
    templatesDir: path.join(__dirname, '../templates'),
    clientDir: path.join(__dirname, '../client')
};

// Helper function to apply base template
async function applyTemplate(content, title) {
    const baseTemplate = await fs.readFile(path.join(config.templatesDir, 'base.html'), 'utf-8');
    return baseTemplate
        .replace('{{title}}', title)
        .replace('{{content}}', content);
}

async function buildSite() {
    try {
        // Ensure output directories exist
        await fs.ensureDir(config.outputDir);
        await fs.ensureDir(path.join(config.outputDir, 'posts'));
        
        // Copy static files
        await fs.copy(path.join(config.clientDir, 'css'), path.join(config.outputDir, 'css'));
        await fs.copy(path.join(config.clientDir, 'js'), path.join(config.outputDir, 'js'));

        // Build index page
        const indexContent = await fs.readFile(path.join(config.templatesDir, 'index.html'), 'utf-8');
        const indexHtml = await applyTemplate(indexContent, 'Home');
        await fs.writeFile(path.join(config.outputDir, 'index.html'), indexHtml);

        // Build blog page
        const blogContent = await fs.readFile(path.join(config.templatesDir, 'blog.html'), 'utf-8');
        const blogHtml = await applyTemplate(blogContent, 'Blog');
        await fs.writeFile(path.join(config.outputDir, 'blog.html'), blogHtml);
        
        // Process markdown files for posts
        const posts = await processMarkdownFiles();
        
        // Process markdown files for pages
        await processPages();
        
        // Update posts index
        await updatePostsIndex(posts);
        
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

async function processPages() {
    const files = await fs.readdir(config.pagesDir);
    
    for (const file of files) {
        if (path.extname(file) === '.md') {
            const filePath = path.join(config.pagesDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const html = marked.parse(content);
            
            // Extract page name and title
            const pageName = path.basename(file, '.md');
            const title = extractTitle(content);
            
            // Apply template and save
            const pageHtml = await applyTemplate(html, title);
            await fs.writeFile(
                path.join(config.outputDir, `${pageName}.html`),
                pageHtml
            );
        }
    }
}

async function processMarkdownFiles() {
    const posts = [];
    const files = await fs.readdir(config.postsDir);
    
    for (const file of files) {
        if (path.extname(file) === '.md') {
            const filePath = path.join(config.postsDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const html = marked.parse(content);
            
            // Extract metadata from filename
            const slug = path.basename(file, '.md');
            const stats = await fs.stat(filePath);
            
            // Create post object
            const post = {
                title: extractTitle(content),
                slug,
                date: stats.mtime,
                content: html
            };
            
            posts.push(post);
            
            // Save as HTML
            await savePostAsHtml(post);
        }
    }
    
    return posts;
}

function extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled Post';
}

async function savePostAsHtml(post) {
    const postTemplate = await fs.readFile(path.join(config.templatesDir, 'post.html'), 'utf-8');
    const postContent = postTemplate
        .replace('{{title}}', post.title)
        .replace('{{content}}', post.content)
        .replace('{{date}}', new Date(post.date).toLocaleDateString());
    
    const html = await applyTemplate(postContent, post.title);
    
    await fs.writeFile(
        path.join(config.outputDir, 'posts', `${post.slug}.html`),
        html
    );
}

async function updatePostsIndex(posts) {
    const indexData = {
        posts: posts.map(post => ({
            title: post.title,
            slug: post.slug,
            date: post.date,
            excerpt: extractExcerpt(post.content)
        }))
    };
    
    await fs.writeFile(
        path.join(config.outputDir, 'posts/index.json'),
        JSON.stringify(indexData, null, 2)
    );
}

function extractExcerpt(content) {
    const text = content.replace(/<[^>]+>/g, '');
    return text.slice(0, 150) + '...';
}

buildSite(); 