const exploreFeedEl = document.getElementById('exploreFeed');

function renderPostCard(p){
  const div = document.createElement('div');
  div.className='card post';
  
  const timeAgo = getTimeAgo(new Date(p.createdAt));
  
  div.innerHTML = `
    <div class="post-header">
      <div class="post-avatar" onclick="navigateToProfile('${p.author?.username}')">
        ${p.author?.profilePicture ? 
          `<img src="http://localhost:4000${p.author.profilePicture}" alt="${p.author.username}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-size:1.2rem; color:#9ca3af;">${(p.author?.username || 'U')[0].toUpperCase()}</div>` :
          `${(p.author?.username || 'U')[0].toUpperCase()}`
        }
      </div>
      <div>
        <div class="post-author" onclick="navigateToProfile('${p.author?.username}')">@${p.author?.username || 'user'}</div>
        <div class="post-time">${timeAgo}</div>
      </div>
    </div>
    <div class="post-content">${p.text ? p.text.replace(/</g, '&lt;').replace(/\n/g, '<br>') : ''}</div>
    ${p.image ? `<img src="${p.image}" alt="Post image" loading="lazy" class="post-image" />` : ''}
    <div class="post-actions">
      <button class="post-action" onclick="alert('Like feature coming soon')">
        ❤️ ${p.likes?.length || 0}
      </button>
      <button class="post-action" data-comments="${p._id}">
        💬 ${p.comments?.length || 0}
      </button>
      <button class="post-action" data-share="${p._id}">
        🔄 <span id="share-count-${p._id}">0</span>
      </button>
    </div>
    <div class="comments-section" id="comments-${p._id}" style="display: none;">
      <div class="comments-list" id="comments-list-${p._id}">
        <!-- Comments will be loaded here -->
      </div>
      <div class="comment-form">
        <textarea class="comment-input" placeholder="Write a comment..." rows="1" id="comment-input-${p._id}"></textarea>
        <button class="comment-submit" data-post-id="${p._id}">Post</button>
      </div>
    </div>
  `;
  
  // Comments button event listener
  div.querySelector('[data-comments]')?.addEventListener('click', async (e) => {
    const postId = e.currentTarget.getAttribute('data-comments');
    const commentsSection = document.getElementById(`comments-${postId}`);
    
    if (commentsSection.style.display === 'none') {
      commentsSection.style.display = 'block';
      await loadComments(postId);
    } else {
      commentsSection.style.display = 'none';
    }
  });

  // Comment submit button event listener
  div.querySelector('.comment-submit')?.addEventListener('click', async (e) => {
    const postId = e.currentTarget.getAttribute('data-post-id');
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
      e.currentTarget.disabled = true;
      e.currentTarget.textContent = 'Posting...';
      
      await window.API.createComment(postId, text);
      input.value = '';
      await loadComments(postId);
      
      // Update comment count
      const commentButton = div.querySelector('[data-comments]');
      const currentCount = parseInt(commentButton.textContent.match(/\d+/)[0]) || 0;
      commentButton.innerHTML = `💬 ${currentCount + 1}`;
      
    } catch (err) {
      alert(`Failed to post comment: ${err.message}`);
    } finally {
      e.currentTarget.disabled = false;
      e.currentTarget.textContent = 'Post';
    }
  });

  // Share button event listener
  div.querySelector('[data-share]')?.addEventListener('click', async (e) => {
    const postId = e.currentTarget.getAttribute('data-share');
    showShareModal(postId, p);
  });

  // Load share count
  loadShareCount(p._id);
  
  return div;
}

function navigateToProfile(username) {
  if (username) {
    window.location.href = `profile.html?u=${encodeURIComponent(username)}`;
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

// Get current user for explore page
let currentUser = null;

async function getCurrentUser() {
  try {
    currentUser = await window.API.me();
    return currentUser;
  } catch (err) {
    console.error('Failed to get current user:', err);
    return null;
  }
}

async function loadComments(postId) {
  const commentsList = document.getElementById(`comments-list-${postId}`);
  
  try {
    commentsList.innerHTML = '<div style="text-align: center; color: #9ca3af;">Loading comments...</div>';
    
    const comments = await window.API.getComments(postId);
    
    if (comments.length === 0) {
      commentsList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 16px;">No comments yet. Be the first to comment!</div>';
      return;
    }
    
    commentsList.innerHTML = '';
    comments.forEach(comment => {
      const commentEl = renderComment(comment);
      commentsList.appendChild(commentEl);
    });
    
  } catch (err) {
    commentsList.innerHTML = '<div style="text-align: center; color: #ef4444;">Failed to load comments</div>';
  }
}

function renderComment(comment) {
  const div = document.createElement('div');
  div.className = comment.parentComment ? 'comment comment-reply' : 'comment';
  div.dataset.commentId = comment._id;
  
  const isAuthor = currentUser && (currentUser._id === comment.author?._id || currentUser.id === comment.author?._id);
  const timeAgo = getTimeAgo(new Date(comment.createdAt));
  
  div.innerHTML = `
    ${comment.replyTo ? `<div class="comment-reply-indicator">Replying to @${comment.replyTo.username}</div>` : ''}
    <div style="display: flex; gap: 8px;">
      <div class="comment-avatar" onclick="navigateToProfile('${comment.author?.username}')">
        ${comment.author?.profilePicture ? 
          `<img src="http://localhost:4000${comment.author.profilePicture}" alt="${comment.author.username}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-size:0.8rem; color:#9ca3af;">${(comment.author?.username || 'U')[0].toUpperCase()}</div>` :
          `${(comment.author?.username || 'U')[0].toUpperCase()}`
        }
      </div>
      <div class="comment-content">
        <div class="comment-author" onclick="navigateToProfile('${comment.author?.username}')">@${comment.author?.username || 'user'}</div>
        <div class="comment-text">${comment.text.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div>
        <div class="comment-time">${timeAgo}</div>
        <div class="comment-actions-buttons">
          <button class="comment-reply-btn" data-comment-id="${comment._id}" data-author-id="${comment.author._id}" data-author-username="${comment.author.username}">
            Reply
          </button>
          ${isAuthor ? `
            <button class="comment-delete-btn" data-comment-id="${comment._id}" data-post-id="${comment.postId}">
              Delete
            </button>
          ` : ''}
        </div>
        <div class="reply-form" id="reply-form-${comment._id}">
          <textarea class="reply-input" placeholder="Write a reply..." rows="1"></textarea>
          <div class="reply-actions">
            <button class="reply-cancel">Cancel</button>
            <button class="reply-submit" data-comment-id="${comment._id}" data-post-id="${comment.postId}" data-reply-to="${comment.author._id}">Reply</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Delete comment event listener
  div.querySelector('.comment-delete-btn')?.addEventListener('click', async (e) => {
    const commentId = e.currentTarget.getAttribute('data-comment-id');
    const postId = e.currentTarget.getAttribute('data-post-id');
    
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await window.API.deleteComment(commentId);
      div.remove();
      
      // Update comment count
      const commentButton = document.querySelector(`[data-comments="${postId}"]`);
      const currentCount = parseInt(commentButton.textContent.match(/\d+/)[0]) || 0;
      commentButton.innerHTML = `💬 ${Math.max(0, currentCount - 1)}`;
      
    } catch (err) {
      alert(`Failed to delete comment: ${err.message}`);
    }
  });

  // Reply button event listener
  div.querySelector('.comment-reply-btn')?.addEventListener('click', (e) => {
    const commentId = e.currentTarget.getAttribute('data-comment-id');
    const replyForm = document.getElementById(`reply-form-${commentId}`);
    
    // Hide all other reply forms
    document.querySelectorAll('.reply-form').forEach(form => {
      if (form.id !== `reply-form-${commentId}`) {
        form.classList.remove('active');
      }
    });
    
    // Toggle this reply form
    replyForm.classList.toggle('active');
    if (replyForm.classList.contains('active')) {
      replyForm.querySelector('.reply-input').focus();
    }
  });

  // Reply cancel button event listener
  div.querySelector('.reply-cancel')?.addEventListener('click', (e) => {
    const replyForm = e.currentTarget.closest('.reply-form');
    replyForm.classList.remove('active');
    replyForm.querySelector('.reply-input').value = '';
  });

  // Reply submit button event listener
  div.querySelector('.reply-submit')?.addEventListener('click', async (e) => {
    const button = e.currentTarget;
    const commentId = button.getAttribute('data-comment-id');
    const postId = button.getAttribute('data-post-id');
    const replyToId = button.getAttribute('data-reply-to');
    const replyForm = e.currentTarget.closest('.reply-form');
    const input = replyForm.querySelector('.reply-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
      button.disabled = true;
      button.textContent = 'Replying...';
      
      await window.API.createComment(postId, text, commentId, replyToId);
      
      // Clear form and hide it
      input.value = '';
      replyForm.classList.remove('active');
      
      // Reload comments to show the new reply
      await loadComments(postId);
      
      // Update comment count
      const commentButton = document.querySelector(`[data-comments="${postId}"]`);
      const currentCount = parseInt(commentButton.textContent.match(/\d+/)[0]) || 0;
      commentButton.innerHTML = `💬 ${currentCount + 1}`;
      
    } catch (err) {
      alert(`Failed to post reply: ${err.message}`);
    } finally {
      button.disabled = false;
      button.textContent = 'Reply';
    }
  });
  
  return div;
}

// Share helper functions (same as home.js)
async function loadShareCount(postId) {
  try {
    const result = await window.API.getShareCount(postId);
    const shareCountEl = document.getElementById(`share-count-${postId}`);
    if (shareCountEl) {
      shareCountEl.textContent = result.count || 0;
    }
  } catch (err) {
    console.error('Failed to load share count:', err);
  }
}

function showShareModal(postId, post) {
  const modal = document.createElement('div');
  modal.className = 'share-modal';
  modal.innerHTML = `
    <div class="share-modal-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3>Share Post</h3>
        <button class="close" onclick="this.closest('.share-modal').remove()">×</button>
      </div>
      
      <div class="share-options">
        <div class="share-option" data-type="link">
          <div class="share-option-icon">🔗</div>
          <div class="share-option-content">
            <div class="share-option-title">Copy Link</div>
            <div class="share-option-desc">Copy link to this post</div>
          </div>
        </div>
        
        <div class="share-option" data-type="repost">
          <div class="share-option-icon">🔄</div>
          <div class="share-option-content">
            <div class="share-option-title">Repost</div>
            <div class="share-option-desc">Share this post to your followers</div>
          </div>
        </div>
      </div>
      
      <div id="repost-form" style="display: none;">
        <textarea class="share-text-input" placeholder="Add your thoughts (optional)..." maxlength="500"></textarea>
        <div class="share-actions">
          <button class="share-cancel" onclick="this.closest('.share-modal').remove()">Cancel</button>
          <button class="share-submit" data-post-id="${postId}">Share</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle share option clicks
  modal.querySelectorAll('.share-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const type = e.currentTarget.getAttribute('data-type');
      
      if (type === 'link') {
        copyPostLink(postId);
        modal.remove();
      } else if (type === 'repost') {
        modal.querySelector('.share-options').style.display = 'none';
        modal.querySelector('#repost-form').style.display = 'block';
      }
    });
  });
  
  // Handle repost submit
  modal.querySelector('.share-submit')?.addEventListener('click', async (e) => {
    const button = e.currentTarget;
    const textarea = modal.querySelector('.share-text-input');
    const text = textarea.value.trim();
    
    try {
      button.disabled = true;
      button.textContent = 'Sharing...';
      
      await window.API.sharePost(postId, 'repost', text);
      
      // Update share count
      await loadShareCount(postId);
      
      modal.remove();
      alert('Post shared successfully!');
      
    } catch (err) {
      alert(`Failed to share post: ${err.message}`);
      button.disabled = false;
      button.textContent = 'Share';
    }
  });
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function copyPostLink(postId) {
  const link = `${window.location.origin}/post/${postId}`;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      alert('Post link copied to clipboard!');
    }).catch(() => {
      fallbackCopyTextToClipboard(link);
    });
  } else {
    fallbackCopyTextToClipboard(link);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    alert('Post link copied to clipboard!');
  } catch (err) {
    alert('Failed to copy link. Please copy manually: ' + text);
  }
  
  document.body.removeChild(textArea);
}

async function init(){
  exploreFeedEl.innerHTML = '<div class="card">Loading posts...</div>';
  
  try{
    // Get current user info first
    await getCurrentUser();
    
    const posts = await window.API.fetchFeed();
    exploreFeedEl.innerHTML = '';
    
    if (posts && posts.length > 0) {
      posts.forEach(p => exploreFeedEl.appendChild(renderPostCard(p)));
    } else {
      exploreFeedEl.innerHTML = `
        <div class="card text-center">
          <h3>No posts to explore yet</h3>
          <p>Check back later for new content!</p>
          <button class="create-post" onclick="location.href='index.html'">
            Go to Home
          </button>
        </div>
      `;
    }
  }catch(err){
    exploreFeedEl.innerHTML = `
      <div class="card text-center text-error">
        <h3>Failed to load explore feed</h3>
        <p>${err.message}</p>
        <button class="create-post" onclick="init()">Try Again</button>
      </div>
    `;
  }
}

init();






