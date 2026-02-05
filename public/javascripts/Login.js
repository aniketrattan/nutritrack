console.log('✅ Login.js loaded!');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const errorMsg = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('email', email);

        // Hang added, store login state for use in home.js
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('avatarUrl', 'https://i.pravatar.cc/40?u=' + encodeURIComponent(email));


        if (data.role === 'admin') {
          window.location.href = '/admin.html';
        } else if (data.status === 'old') {
          window.location.href = '/home.html';
        } else {
          window.location.href = '/Profile-login.html';
        }

      } else {
        errorMsg.textContent = data.error;
      }
    } catch (err) {
      console.error(err);
      errorMsg.textContent = 'Error connecting to server.';
    }
  });
});

// handle logout
document.addEventListener('click', (e) => {
  if (e.target.matches('.logout-btn')) {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('avatarUrl');
    window.location.href = '/home.html';
  }
});