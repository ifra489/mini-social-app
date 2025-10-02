const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authError = document.getElementById('authError');

function showTab(which){
  if(which==='login'){
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
  }else{
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
  }
  authError.textContent='';
}

tabLogin?.addEventListener('click',()=>showTab('login'));
tabSignup?.addEventListener('click',()=>showTab('signup'));

loginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  authError.textContent='';
  const body = Object.fromEntries(new FormData(loginForm).entries());
  
  // Disable submit button during request
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';
  
  try{
    await window.API.login(body);
    // Only redirect on successful login
    location.href = 'index.html';
  }catch(err){
    // Re-enable button and show error
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    authError.textContent = err.message || 'Login failed';
    // Ensure any invalid token is removed
    localStorage.removeItem('token');
  }
});

signupForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  authError.textContent='';
  const raw = Object.fromEntries(new FormData(signupForm).entries());
  const body = {
    username: raw.username,
    email: raw.email,
    password: raw.password,
    bio: raw.bio || '',
    profilePicture: raw.profilePicture || ''
  };
  
  // Disable submit button during request
  const submitBtn = signupForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';
  
  try{
    await window.API.signup(body);
    // Only redirect on successful signup
    location.href = 'index.html';
  }catch(err){
    // Re-enable button and show error
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    authError.textContent = err.message || 'Signup failed';
    // Ensure any invalid token is removed
    localStorage.removeItem('token');
  }
});

// Check if already logged in with valid token
async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    // Verify token is still valid by calling /me endpoint
    await window.API.me();
    // If successful, redirect to home
    location.href = 'index.html';
  } catch (err) {
    // Token is invalid/expired, remove it
    localStorage.removeItem('token');
  }
}

// Only check auth status after API is loaded
if (window.API) {
  checkAuthStatus();
} else {
  // Wait for API to be available
  window.addEventListener('load', checkAuthStatus);
}



