const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');

// Configuration
const config = {
    postsDir: 'posts',
    outputDir: 'dist',
    templateFile: 'templates/post.html'
};

async function buildSite() {
    try {
        // Ensure output directories exist
        await fs.ensureDir(config.outputDir);
        await fs.ensureDir(path.join(config.outputDir, 'posts'));
        
        // Copy static files
        await fs.copy('css', path.join(config.outputDir, 'css'));
        await fs.copy('js', path.join(config.outputDir, 'js'));
        await fs.copy('index.html', path.join(config.outputDir, 'index.html'));
        await fs.copy('blog.html', path.join(config.outputDir, 'blog.html'));
        
        // Process markdown files
        const posts = await processMarkdownFiles();
        
        // Update posts index
        await updatePostsIndex(posts);
        
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
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
    const template = await fs.readFile(config.templateFile, 'utf-8');
    const html = template
        .replace('{{title}}', post.title)
        .replace('{{content}}', post.content)
        .replace('{{date}}', new Date(post.date).toLocaleDateString());
    
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