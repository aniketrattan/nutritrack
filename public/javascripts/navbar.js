// Show avatar or sign-in button based on login state
window.addEventListener("DOMContentLoaded", () => {
  const userArea = document.getElementById("user-area");

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const avatarUrl = localStorage.getItem("avatarUrl") || "https://i.pravatar.cc/40?u=default";

  if (!userArea) return;

  if (isLoggedIn) {
    userArea.innerHTML = `
      <div style="position: relative;">
        <img src="${avatarUrl}" alt="User Avatar" class="user-avatar" onclick="toggleDropdown()" />
        <div id="userDropdown" class="dropdown-menu">
          <a href="Profile.html">Profile</a>
          <a href="#" onclick="logout()">Log Out</a>
        </div>
      </div>
    `;
  } else {
    userArea.innerHTML = `
      <a href="SignUp.html" class="btn btn-signin">Sign In</a>
    `;
  }
});

// Dropdown toggle logic
window.toggleDropdown = function () {
  const dropdown = document.getElementById("userDropdown");
  dropdown?.classList.toggle("show");
};

// Close dropdown if clicked outside
window.onclick = function (event) {
  const dropdown = document.getElementById("userDropdown");
  const avatar = document.querySelector(".user-avatar");
  if (dropdown && !dropdown.contains(event.target) && event.target !== avatar) {
    dropdown.classList.remove("show");
  }
};

// Logout function
window.logout = function () {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("avatarUrl");
  window.location.href = "home.html";
};
