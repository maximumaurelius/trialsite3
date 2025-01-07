// Fetch and parse markdown content
async function fetchMarkdown(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch content');
        return await response.text();
    } catch (error) {
        console.error('Error fetching markdown:', error);
        return null;
    }
}

// Simple markdown parser (you might want to use a library like marked.js for production)
function parseMarkdown(markdown) {
    if (!markdown) return '';
    
    // Basic Markdown parsing rules
    return markdown
        // Headers
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Lists
        .replace(/^\s*\-\s(.*)/gm, '<li>$1</li>')
        // Paragraphs
        .replace(/^(?!<[h|l])(.*$)/gm, '<p>$1</p>');
}

// Load recent posts
async function loadRecentPosts() {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;

    try {
        const response = await fetch('/posts/index.json');
        if (!response.ok) throw new Error('Failed to fetch posts index');
        
        const data = await response.json();
        const posts = data.posts;
        
        const postsHTML = posts.map(post => `
            <article class="post-card">
                <h3>${post.title}</h3>
                <p class="post-date">${new Date(post.date).toLocaleDateString()}</p>
                <p>${post.excerpt}</p>
                <a href="/posts/${post.slug}.html">Read more</a>
            </article>
        `).join('');
        
        postsContainer.innerHTML = postsHTML || '<p>No posts found.</p>';
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = '<p>Failed to load posts. Please try again later.</p>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadRecentPosts();
}); 