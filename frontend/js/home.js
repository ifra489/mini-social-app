const feedEl = document.getElementById('feed');
const postModal = document.getElementById('postModal');
const openPostModalBtn = document.getElementById('openPostModal');
const closePostModalBtn = document.getElementById('closePostModal');
const postForm = document.getElementById('postForm');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;

// Get current user info
async function getCurrentUser() {
  try {
    currentUser = await window.API.me();
    return currentUser;
  } catch (err) {
    console.error('Failed to get current user:', err);
    return null;
  }
}

function renderPost(post) {
  const div = document.createElement('div');
  div.className = 'card post';
  div.dataset.postId = post._id;
  
  const timeAgo = getTimeAgo(new Date(post.createdAt));
  const isLiked = post.userLiked || false; // This would come from backend
  
  // Check if current user is the author
  const isAuthor = currentUser && (currentUser._id === post.author?._id || currentUser.id === post.author?._id);
  
  div.innerHTML = `
    <div class="post-header">
      <div class="post-avatar" onclick="navigateToProfile('${post.author?.username}')">
        ${post.author?.profilePicture ? 
          `<img src="http://localhost:4000${post.author.profilePicture}" alt="${post.author.username}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-size:1.2rem; color:#9ca3af;">${(post.author?.username || 'U')[0].toUpperCase()}</div>` :
          `${(post.author?.username || 'U')[0].toUpperCase()}`
        }
      </div>
      <div>
        <div class="post-author" onclick="navigateToProfile('${post.author?.username}')">@${post.author?.username || 'user'}</div>
        <div class="post-time">${timeAgo}</div>
      </div>
      ${isAuthor ? `
        <div class="post-header-actions">
          <button class="post-delete-btn" data-delete="${post._id}">
            🗑️ Delete
          </button>
        </div>
      ` : ''}
    </div>
    <div class="post-content">${post.text ? post.text.replace(/</g, '&lt;').replace(/\n/g, '<br>') : ''}</div>
    ${post.image ? `<img src="${post.image}" alt="Post image" loading="lazy" class="post-image" />` : ''}
    <div class="post-actions">
      <button class="post-action ${isLiked ? 'liked' : ''}" data-like="${post._id}">
        ❤️ ${post.likes?.length || 0}
      </button>
      <button class="post-action" data-comments="${post._id}">
        💬 ${post.comments?.length || 0}
      </button>
      <button class="post-action" data-share="${post._id}">
        🔄 <span id="share-count-${post._id}">0</span>
      </button>
    </div>
    <div class="comments-section" id="comments-${post._id}" style="display: none;">
      <div class="comments-list" id="comments-list-${post._id}">
        <!-- Comments will be loaded here -->
      </div>
      <div class="comment-form">
        <textarea class="comment-input" placeholder="Write a comment..." rows="1" id="comment-input-${post._id}"></textarea>
        <button class="comment-submit" data-post-id="${post._id}">Post</button>
      </div>
    </div>
  `;
  
  // Like button event listener
  div.querySelector('[data-like]')?.addEventListener('click', async (e) => {
    const id = e.currentTarget.getAttribute('data-like');
    const button = e.currentTarget;
    
    try {
      button.disabled = true;
      const res = await window.API.likePost(id);
      button.textContent = `❤️ ${res.likes}`;
      button.classList.toggle('liked', res.liked);
    } catch (err) {
      alert(err.message);
    } finally {
      button.disabled = false;
    }
  });
  
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
    showShareModal(postId, post);
  });

  // Load share count
  loadShareCount(post._id);

  // Delete button event listener
  div.querySelector('[data-delete]')?.addEventListener('click', async (e) => {
    const id = e.currentTarget.getAttribute('data-delete');
    const button = e.currentTarget;
    
    // Confirmation popup
    const confirmDelete = confirm('Are you sure you want to delete this post?');
    if (!confirmDelete) return;
    
    try {
      button.disabled = true;
      button.textContent = '🗑️ Deleting...';
      
      await window.API.deletePost(id);
      
      // Remove post from DOM without reloading
      const postElement = div;
      if (postElement) {
        postElement.style.opacity = '0';
        postElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
          postElement.remove();
          
          // Check if feed is now empty
          if (feedEl.children.length === 0) {
            feedEl.innerHTML = `
              <div class="card text-center">
                <h3>No posts yet</h3>
                <p>Be the first to share something!</p>
                <button class="create-post" onclick="document.getElementById('openPostModal').click()">
                  Create your first post
                </button>
              </div>
            `;
          }
        }, 200);
      }
    } catch (err) {
      alert(`Failed to delete post: ${err.message}`);
      button.disabled = false;
      button.textContent = '🗑️ Delete';
    }
  });
  
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

async function loadFeed() {
  feedEl.innerHTML = '<div class="card">Loading posts...</div>';
  
  try {
    // Get current user info first
    await getCurrentUser();
    
    const posts = await window.API.fetchFeed();
    
    feedEl.innerHTML = '';
    
    if (posts && posts.length > 0) {
      posts.forEach((p) => feedEl.appendChild(renderPost(p)));
    } else {
      feedEl.innerHTML = `
        <div class="card text-center">
          <h3>No posts yet</h3>
          <p>Be the first to share something!</p>
          <button class="create-post" onclick="document.getElementById('openPostModal').click()">
            Create your first post
          </button>
        </div>
      `;
    }
  } catch (err) {
    feedEl.innerHTML = `
      <div class="card text-center text-error">
        <h3>Failed to load feed</h3>
        <p>${err.message}</p>
        <button class="create-post" onclick="loadFeed()">Try Again</button>
      </div>
    `;
  }
}

openPostModalBtn?.addEventListener('click', () => postModal.classList.remove('hidden'));
closePostModalBtn?.addEventListener('click', () => postModal.classList.add('hidden'));

postForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(postForm);
  try {
    await window.API.createPost(formData);
    postModal.classList.add('hidden');
    postForm.reset();
    loadFeed();
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn?.addEventListener('click', async () => {
  await window.API.logout();
  location.href = 'auth.html';
});

loadFeed();


