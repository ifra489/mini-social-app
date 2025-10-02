// Reusable authentication check utility
async function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    location.href = 'auth.html';
    return false;
  }
  
  try {
    // Verify token is still valid
    await window.API.me();
    return true;
  } catch (err) {
    // Token is invalid/expired, redirect to auth
    localStorage.removeItem('token');
    location.href = 'auth.html';
    return false;
  }
}

// Export for use in other scripts
window.requireAuth = requireAuth;








