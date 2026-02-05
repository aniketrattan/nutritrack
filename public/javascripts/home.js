// Toggle dropdown menu when user avatar is clicked
function toggleDropdown() {
  const dropdown = document.getElementById("userDropdown");
  dropdown.classList.toggle("show");
}

// Hide dropdown if clicking outside of it
window.onclick = function (event) {
  const dropdown = document.getElementById("userDropdown");
  const avatar = document.querySelector(".user-avatar");
  if (dropdown && !dropdown.contains(event.target) && event.target !== avatar) {
    dropdown.classList.remove("show");
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  let data;
  try {
    const resp = await fetch("/api/status", { credentials: "include" });
    data = await resp.json();
  } catch (err) {
    console.error("Status fetch failed", err);
    data = {};
  }

  if (data.email) {
    // … your existing “show avatar, profile & logout” logic …
  } else {
    // Hide anything avatar-related
    const avatar = document.querySelector(".user-avatar");
    const dropdown = document.getElementById("userDropdown");
    if (avatar) avatar.style.display = "none";
    if (dropdown) dropdown.style.display = "none";

    // Show your Sign In / Sign Up links instead
    const signin = document.getElementById("signInLink");
    const signup = document.getElementById("signUpLink");
    if (signin) signin.style.display = "inline-block";
    if (signup) signup.style.display = "inline-block";

    // And hide any “meal plan” or “favorites” nav items
    const mp = document.getElementById("mealPlanLink");
    const fav = document.getElementById("myFavoritesLink");
    if (mp) mp.style.display = "none";
    if (fav) fav.style.display = "none";
  }
});

// Load user state and update UI
window.addEventListener("DOMContentLoaded", async () => {
  const userArea = document.getElementById("user-area");
  const ingredientsLink = document.getElementById("nav-ingredients");
  const mealPlanLink = document.getElementById("nav-mealplan");
  const myFavoritesLink = document.getElementById("nav-favorites");

  // Check login status via API
  let isLoggedIn = false;
  try {
    const statusRes = await fetch("/api/status", {
      method: "GET",
      credentials: "include",
    });
    isLoggedIn = statusRes.ok;
  } catch (err) {
    console.error("Error checking login status:", err);
  }

  if (isLoggedIn) {
    // Show links after login
    if (ingredientsLink) ingredientsLink.style.display = "inline";
    if (mealPlanLink) mealPlanLink.style.display = "inline";
    if (myFavoritesLink) myFavoritesLink.style.display = "inline";

    // Fetch user profile for avatar URL
    let avatarUrl = "https://i.pravatar.cc/40?u=default";
    try {
      const profRes = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (profRes.ok) {
        const profile = await profRes.json();
        if (profile.avatar_url) {
          avatarUrl = profile.avatar_url;
        }
      }
    } catch (err) {
      console.error("Error fetching profile for avatar:", err);
    }

    // Replace Sign In with avatar dropdown
    if (userArea) {
      userArea.innerHTML = `
        <div style="position: relative;">
          <img src="${avatarUrl}" alt="User Avatar" class="user-avatar" onclick="toggleDropdown()" />
          <div id="userDropdown" class="dropdown-menu">
            <a href="Profile.html">Profile</a>
            <a href="/api/logout">Log Out</a>
          </div>
        </div>
      `;
    }
  } else {
    // Not logged in: hide protected links
    if (ingredientsLink) ingredientsLink.style.display = "none";
    if (mealPlanLink) mealPlanLink.style.display = "none";
    if (myFavoritesLink) myFavoritesLink.style.display = "none";

    if (userArea) {
      userArea.innerHTML = `
        <a href="Login.html" class="btn btn-signin">Sign In</a>
      `;
    }
  }
});

window.logout = async function logout() {
  // 1) tell the server to destroy the real session
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  });

  // 2) force‐expire the client‐side cookie
  document.cookie =
    "connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;";

  // 3) redirect back to the public home
  window.location.href = "home.html";
};
