const form = document.getElementById('addUserForm');
const tableBody = document.getElementById('userTableBody');

// Move renderUsers to top to avoid use-before-define
function renderUsers(users) {
  tableBody.innerHTML = '';
  users.forEach((user) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.user_id}</td>
      <td><img src="https://i.pravatar.cc/40?u=${user.username}" alt="avatar" width="40" /></td>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.age ? user.age : ''}</td>
      <td>${user.sex ? user.sex : ''}</td>
      <td>
        <button onclick="deleteUser(${user.user_id})" style="background:#e53935;color:white;">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// Load users
async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    const users = await res.json();
    renderUsers(users);
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

// Submit: add user
// Handle form submission to add a new user
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // Prevent page reload on form submit

  // Get form input values
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const age = document.getElementById('age').value.trim();
  const sex = document.getElementById('sex').value.trim();


  // Validate required fields
  if (!username || !email) {
    alert('Username and Email are required');
    return;
  }

  if (age && (!/^\d+$/.test(age) || parseInt(age, 10) < 0)) {
  alert('Please enter a valid integer age');
  return;
}

  try {
    // Send POST request to backend to add user
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        age,
        sex
      })
    });

    if (res.ok) {
      form.reset(); // Clear form
      await loadUsers(); // Reload user list
    } else {
      const data = await res.json();
      alert('Failed to add user: ' + data.error); // Show error from backend
    }
  } catch (err) {
    console.error('Error adding user:', err); // Handle unexpected errors
  }
});

// Delete user
async function deleteUser(userId) {
  // eslint-disable-next-line no-restricted-globals
  if (!confirm('Are you sure you want to delete this user?')) return;

  try {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadUsers();
    } else {
      alert('Failed to delete user');
    }
  } catch (err) {
    console.error('Error deleting user:', err);
  }
}

// ─── Log Out Handler ─────────────────────────────────────────────────────
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    })
    .finally(() => {
      // send them back to home.html
      window.location.href = "/home.html";
    });
  });
}


window.addEventListener('DOMContentLoaded', loadUsers);
