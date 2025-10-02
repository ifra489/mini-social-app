const profileEl = document.getElementById('profile');
const profilePostsEl = document.getElementById('profilePosts');

let currentUser = null;

function getUsernameFromQuery() {
  const params = new URLSearchParams(location.search);
  return params.get('u') || null;
}

async function getCurrentUser() {
  try {
    currentUser = await window.API.me();
  } catch (err) {
    currentUser = null;
  }
}

function getInitials(username) {
  return username ? username.charAt(0).toUpperCase() : '?';
}

function renderProfile(user) {
  const profilePicUrl = user.profilePicture 
    ? (user.profilePicture.startsWith("http") 
        ? user.profilePicture 
        : `http://localhost:4000${user.profilePicture}?t=${Date.now()}`)
    : null;

  const profilePicHtml = profilePicUrl
    ? `<img id="profilePic" src="${profilePicUrl}" alt="avatar" class="profile-avatar"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
       <div class="profile-avatar profile-avatar-fallback" style="display:none;">
         ${getInitials(user.username)}
       </div>`
    : `<div class="profile-avatar profile-avatar-fallback">${getInitials(user.username)}</div>`;

  const isOwnProfile = currentUser && currentUser.username === user.username;

  profileEl.innerHTML = `
    <div class="card profile-header">
      <div class="profile-info">
        ${profilePicHtml}
        <div class="profile-details">
          <div class="profile-name-section">
            <h2>@${user.username}</h2>
            ${isOwnProfile ? '<button class="edit-profile-btn" onclick="showEditProfileModal()">Edit Profile</button>' : ''}
          </div>
          ${user.bio ? `<p class="profile-bio">${user.bio}</p>` : (isOwnProfile ? '<p class="profile-bio-empty">Add a bio to tell people about yourself</p>' : '')}
          <div class="profile-stats">
            <span class="stat-item"><strong>${user.followers?.length || 0}</strong> followers</span>
            <span class="stat-item"><strong>${user.following?.length || 0}</strong> following</span>
          </div>
        </div>
      </div>
    </div>
  `;
}




function showEditProfileModal() {
  const modal = document.createElement('div');
  modal.className = 'edit-profile-modal';
  modal.innerHTML = `
    <div class="edit-profile-modal-content">
      <div class="modal-header">
        <h3>Edit Profile</h3>
        <button class="close-btn" onclick="closeEditProfileModal()">×</button>
      </div>
      <form id="editProfileForm" class="edit-profile-form">
        <div class="form-group">
          <label for="editUsername">Username</label>
          <input type="text" id="editUsername" name="username" 
                 value="${currentUser.username || ''}" maxlength="30" required>
        </div>
        <div class="form-group">
          <label for="editBio">Bio</label>
          <textarea id="editBio" name="bio" maxlength="280" rows="3">${currentUser.bio || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Profile Picture</label>
          <div class="profile-picture-options">
            <div class="current-picture">
              ${currentUser.profilePicture 
                ? `<img src="http://localhost:4000${currentUser.profilePicture}" class="current-pic-preview">`
                : `<div class="current-pic-placeholder">${getInitials(currentUser.username)}</div>`}
            </div>
            <div class="picture-upload-options">
              <input type="file" id="profilePictureFile" name="profilePictureFile" accept="image/*" style="display:none;">
              <button type="button" onclick="document.getElementById('profilePictureFile').click()">📁 Upload</button>
              <input type="url" id="editProfilePicture" name="profilePicture" 
                     placeholder="https://example.com/image.jpg" value="${currentUser.profilePicture || ''}">
            </div>
          </div>
          <div id="imagePreview" style="display:none;">
            <img id="previewImg" alt="Preview">
            <button type="button" onclick="removeImagePreview()">×</button>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" onclick="closeEditProfileModal()">Cancel</button>
          <button type="submit" class="save-btn">Save</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const fileInput = document.getElementById('profilePictureFile');
  fileInput.addEventListener('change', handleFileUpload);
  document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProfileChanges();
  });
}

function closeEditProfileModal() {
  const modal = document.querySelector('.edit-profile-modal');
  if (modal) modal.remove();
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please select an image');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    showImagePreview(e.target.result);
    document.getElementById('editProfilePicture').value = '';
  };
  reader.readAsDataURL(file);
}

function showImagePreview(src) {
  const preview = document.getElementById('imagePreview');
  const img = document.getElementById('previewImg');
  img.src = src;

  // Resize logic (max 150x150 px and circle shape)
  img.style.maxWidth = "150px";
  img.style.maxHeight = "150px";
  img.style.borderRadius = "50%";
  img.style.objectFit = "cover";
  img.style.border = "2px solid #ccc";

  preview.style.display = 'block';
}


function removeImagePreview() {
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('profilePictureFile').value = '';
  document.getElementById('editProfilePicture').value = '';
}

async function saveProfileChanges() {
  const form = document.getElementById('editProfileForm');
  const formData = new FormData(form);
  const username = formData.get('username').trim();
  const bio = formData.get('bio').trim();
  const file = formData.get('profilePictureFile');
  const profilePictureUrl = formData.get('profilePicture').trim();

  let updates = { username, bio };

  try {
    let updatedUser;
    if (file && file.size > 0) {
      const uploadFormData = new FormData();
      uploadFormData.append('username', username);
      uploadFormData.append('bio', bio);
      uploadFormData.append('profilePicture', file);
      updatedUser = await window.API.updateSettingsWithFile(uploadFormData);
    } else if (profilePictureUrl) {
      updates.profilePicture = profilePictureUrl;
      updatedUser = await window.API.updateSettings(updates);
    } else {
      updatedUser = await window.API.updateSettings(updates);
    }

    currentUser = { ...currentUser, ...updatedUser };
    renderProfile(currentUser);
    closeEditProfileModal();
    alert("Profile updated successfully!");
  } catch (err) {
    alert("Failed to update profile: " + err.message);
  }
}

async function init() {
  try {
    await getCurrentUser();
    let username = getUsernameFromQuery();
    if (!username) {
      if (!currentUser) {
        window.location.href = 'auth.html';
        return;
      }
      username = currentUser.username;
    }
    const user = await window.API.fetchProfile(username);
    renderProfile(user);
  } catch (err) {
    profileEl.innerHTML = `<div class="card">Failed to load profile: ${err.message}</div>`;
  }
}

init();
