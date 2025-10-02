const form = document.getElementById('settingsForm');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  // If file input exists, use file upload
  const fileInput = document.getElementById('profilePicFile');
  if (fileInput && fileInput.files.length > 0) {
    formData.append('profilePic', fileInput.files[0]);
    try {
      const user = await window.API.updateSettingsWithFile(formData);
      alert('Settings saved');
    } catch (err) {
      alert(err.message);
    }
  } else {
    // Otherwise, send as JSON
    const body = Object.fromEntries(formData.entries());
    try {
      const user = await window.API.updateSettings(body);
      alert('Settings saved');
    } catch (err) {
      alert(err.message);
    }
  }
});











