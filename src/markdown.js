/**
 * Markdown conversion module
 * Function: Convert QQ Space content (notes or articles) to Markdown format
 */

/**
 * Convert note list to Markdown format
 * @param {Array} noteList List of notes
 * @returns {string} Markdown formatted content
 */
function convertNotesToMarkdown(noteList) {
    let markdownContent = '# QQ Space Notes\n\n';
    
    // Add generation information
    markdownContent += `> Generated at: ${new Date().toLocaleString()}\n`;
    markdownContent += `> Number of notes: ${noteList.length}\n\n`;
    
    // Sort by time in descending order (newest first)
    const sortedList = [...noteList].sort((a, b) => {
        return new Date(b.publishTime) - new Date(a.publishTime);
    });
    
    // Generate Markdown for each note
    sortedList.forEach((note, index) => {
        markdownContent += `## Note ${index + 1}\n\n`;
        
        // Publish time
        markdownContent += `**Publish Time**: ${note.publishTime}\n\n`;
        
        // Content
        if (note.content) {
            markdownContent += `${note.content}\n\n`;
        }
        
        // Images
        if (note.images && note.images.length > 0) {
            markdownContent += `**Images**:\n`;
            note.images.forEach(imgUrl => {
                markdownContent += `![Image](${imgUrl})\n\n`;
            });
        }
        
        // Like count
        if (note.likeCount) {
            markdownContent += `**Likes**: ${note.likeCount}\n\n`;
        }
        
        // Divider
        markdownContent += `---\n\n`;
    });
    
    // Remove trailing divider
    markdownContent = markdownContent.replace(/---\n\n$/, '');
    
    return markdownContent;
}

/**
 * Convert article list to Markdown format
 * @param {Array} articleList List of articles
 * @returns {string} Markdown formatted content
 */
function convertArticlesToMarkdown(articleList) {
    let markdownContent = '# QQ Space Articles\n\n';
    
    // Add generation information
    markdownContent += `> Generated at: ${new Date().toLocaleString()}\n`;
    markdownContent += `> Number of articles: ${articleList.length}\n\n`;
    
    // Sort by time in descending order (newest first)
    const sortedList = [...articleList].sort((a, b) => {
        return new Date(b.publishTime) - new Date(a.publishTime);
    });
    
    // Generate Markdown for each article
    sortedList.forEach((article, index) => {
        markdownContent += `# ${article.title}\n\n`;
        
        // Publish time
        markdownContent += `**Publish Time**: ${article.publishTime}\n\n`;
        
        // Article link
        if (article.link) {
            markdownContent += `**Original Link**: [View Article](${article.link})\n\n`;
        }
        
        // Content
        if (article.content) {
            markdownContent += `${article.content}\n\n`;
        } else if (article.summary) {
            markdownContent += `${article.summary}\n\n`;
        }
        
        // Images
        if (article.images && article.images.length > 0) {
            markdownContent += `**Images**:\n`;
            article.images.forEach(imgUrl => {
                markdownContent += `![Image](${imgUrl})\n\n`;
            });
        }
        
        // Divider
        markdownContent += `---\n\n`;
    });
    
    // Remove trailing divider
    markdownContent = markdownContent.replace(/---\n\n$/, '');
    
    return markdownContent;
}

/**
 * Convert content list to Markdown format based on type
 * @param {Array} contentList List of content items
 * @param {string} type Content type: 'notes' or 'articles'
 * @returns {string} Markdown formatted content
 */
function convertToMarkdown(contentList, type = 'notes') {
    if (type === 'articles') {
        return convertArticlesToMarkdown(contentList);
    } else {
        return convertNotesToMarkdown(contentList);
    }
}

module.exports = { convertToMarkdown, convertNotesToMarkdown, convertArticlesToMarkdown };