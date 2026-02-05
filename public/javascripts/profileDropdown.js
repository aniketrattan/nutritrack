function toggleDropdown() {
  document.getElementById("userDropdown").classList.toggle("show");
}

window.onclick = function (event) {
  const dropdown = document.getElementById("userDropdown");
  const avatar = document.querySelector(".user-avatar");
  if (dropdown && !dropdown.contains(event.target) && event.target !== avatar) {
    dropdown.classList.remove("show");
  }
};

window.addEventListener("DOMContentLoaded", async () => {
  const userArea = document.getElementById("user-area");

  try {
    const statusRes = await fetch("/api/status", {
      credentials: "include",
    });
    if (statusRes.status !== 200) {
      // Not logged in → show Sign In link
      userArea.innerHTML = `<a href="/SignUp.html" class="btn btn-signin">Sign In</a>`;
      return;
    }

    // Fetch profile for avatar & username
    const profRes = await fetch("/api/profile", {
      credentials: "include",
    });
    if (!profRes.ok) throw new Error("Failed to fetch profile");
    const { username, avatar_url } = await profRes.json();

    // Render dropdown
    const safeAvatar = avatar_url || "https://i.pravatar.cc/40?u=default";
    const safeUser = document.createElement("div");
    safeUser.textContent = username;

    userArea.innerHTML = `
      <div style="position: relative;">
        <img src="${safeAvatar}" alt="User Avatar"
             class="user-avatar" onclick="toggleDropdown()" />
        <div id="userDropdown" class="dropdown-menu">
          <a href="/Profile.html">Profile</a>
          <a href="#" id="logoutLink">Log Out</a>
        </div>
      </div>`;

    document
      .getElementById("logoutLink")
      .addEventListener("click", async () => {
        await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
        });
        window.location.href = "/home.html";
      });
  } catch (err) {
    console.error("Dropdown init error:", err);
    userArea.innerHTML = `<a href="/SignUp.html" class="btn btn-signin">Sign In</a>`;
  }
});
