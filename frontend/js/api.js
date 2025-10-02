const API_BASE = 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token') || '';
}

async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Request failed');
  return res.json();
}

async function signup({ username, email, password }) {
  const data = await api('/auth/signup', { method: 'POST', body: { username, email, password } });
  localStorage.setItem('token', data.token);
  return data.user;
}

async function login({ identifier, password }) {
  const data = await api('/auth/login', { method: 'POST', body: { identifier, password } });
  localStorage.setItem('token', data.token);
  return data.user;
}

async function logout() {
  await api('/auth/logout', { method: 'POST' });
  localStorage.removeItem('token');
}

async function me() {
  return api('/auth/me');
}

async function fetchFeed() {
  return api('/posts');
}

async function createPost(formData) {
  return api('/posts', { method: 'POST', body: formData, isForm: true });
}

async function likePost(id) {
  return api(`/posts/${id}/like`, { method: 'POST' });
}

async function deletePost(id) {
  return api(`/posts/${id}`, { method: 'DELETE' });
}

async function getComments(postId) {
  return api(`/comments?postId=${postId}`);
}

async function createComment(postId, text, parentComment = null, replyTo = null) {
  const body = { postId, text };
  if (parentComment) body.parentComment = parentComment;
  if (replyTo) body.replyTo = replyTo;
  return api('/comments', { method: 'POST', body });
}

async function deleteComment(id) {
  return api(`/comments/${id}`, { method: 'DELETE' });
}

async function sharePost(postId, shareType = 'repost', text = '') {
  return api('/shares', { method: 'POST', body: { postId, shareType, text } });
}

async function getShareCount(postId) {
  return api(`/shares/count/${postId}`);
}

async function getShares(postId) {
  return api(`/shares?postId=${postId}`);
}

async function fetchProfile(username) {
  return api(`/auth/profile/${encodeURIComponent(username)}`);
}

async function updateSettings(body) {
  return api('/auth/settings', { method: 'PUT', body });
}

async function updateSettingsWithFile(formData) {
  return api('/auth/settings', { method: 'PUT', body: formData, isForm: true });
}

async function fetchUserPosts(username) {
  return api(`/posts/user/${encodeURIComponent(username)}`);
}

window.API = { signup, login, logout, me, fetchFeed, createPost, likePost, deletePost, getComments, createComment, deleteComment, sharePost, getShareCount, getShares, fetchProfile, updateSettings, updateSettingsWithFile, fetchUserPosts };


