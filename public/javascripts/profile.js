/* File: public/javascripts/profile.js */
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Verify login status
  try {
    const statusRes = await fetch("/api/status", { method: "GET", credentials: "include" });
    if (statusRes.status === 401) {
      alert("Please log in first");
      return window.location.href = "/Login.html";
    }
  } catch (err) {
    console.error("Auth check failed:", err);
  }

  // 2. Fetch current profile data
  let profile;
  try {
    const resp = await fetch("/api/profile", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    if (!resp.ok) throw new Error("Failed to load profile");
    profile = await resp.json();
  } catch (err) {
    console.error("Profile fetch error:", err);
    alert("Could not load profile. Please try again.");
    return window.location.href = "/Login.html";
  }

  // 3. Cache the original profile object
  const origProfile = profile;

  // 4. Initialize DOM elements
  const fields = ["username", "email", "age", "sex", "height", "weight", "address"];
  const avatarEl = document.getElementById("avatar");
  const fileInput = document.getElementById("avatar-input");
  const usernameTitle = document.getElementById("username-view-title");
  const editBtn = document.getElementById("edit-btn");

  // 5. Set avatar source
  const avatarUrl = profile.avatar_url
    ? profile.avatar_url
    : `https://i.pravatar.cc/80?u=${profile.user_id || 'default'}`;
  avatarEl.src = avatarUrl;

  // Enable avatar click to upload (only in edit mode)
  let editMode = false;
  avatarEl.addEventListener("click", () => {
    if (editMode) fileInput.click();
  });
  fileInput.addEventListener("change", async () => {
    if (!fileInput.files.length) return;
    const fd = new FormData();
    fd.append("avatar", fileInput.files[0]);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        credentials: "include",
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      avatarEl.src = data.avatarUrl;
      alert("Avatar updated");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading avatar: " + err.message);
    }
  });

  // 6. Populate fields with profile data
  usernameTitle.textContent = profile.username || "User";
  fields.forEach(field => {
    const view = document.getElementById(`${field}-view`);
    const input = document.getElementById(`${field}-input`);
    let val = profile[field] != null ? profile[field] : "";
    if (field === "height" && val !== "") view.textContent = `${parseFloat(val).toFixed(2)} cm`;
    else if (field === "weight" && val !== "") view.textContent = `${parseFloat(val).toFixed(2)} kg`;
    else view.textContent = val;
    input.value = val;
  });

  // 7. Toggle between view and edit mode
  function toggleMode(toEdit) {
    fields.forEach(f => {
      document.getElementById(`${f}-view`).style.display = toEdit ? "none" : "inline";
      document.getElementById(`${f}-input`).style.display = toEdit ? "inline" : "none";
    });
    editBtn.textContent = toEdit ? "💾 Save" : "✏️ Edit";
  }
  toggleMode(false);

  // 8. Handle edit/save button click
  editBtn.addEventListener("click", async () => {
    if (!editMode) {
      toggleMode(true);
      editMode = true;
      return;
    }
    // Build payload: fallback to original data if input is empty
    const payload = {
      username: document.getElementById("username-input").value.trim() || origProfile.username,
      email:    document.getElementById("email-input").value.trim()    || origProfile.email,
      age:      parseInt(document.getElementById("age-input").value, 10) || origProfile.age,
      sex:      document.getElementById("sex-input").value             || origProfile.sex,
      height_cm: parseFloat(document.getElementById("height-input").value) || origProfile.height,
      weight_kg: parseFloat(document.getElementById("weight-input").value) || origProfile.weight,
      address:  document.getElementById("address-input").value.trim() || origProfile.address
    };
    console.log("Preparing profile update:", payload);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Update failed");

      // Update view mode values
      fields.forEach(field => {
        const viewEl = document.getElementById(`${field}-view`);
        const newVal = document.getElementById(`${field}-input`).value;
        if (field === "height" && newVal) viewEl.textContent = `${parseFloat(newVal).toFixed(2)} cm`;
        else if (field === "weight" && newVal) viewEl.textContent = `${parseFloat(newVal).toFixed(2)} kg`;
        else viewEl.textContent = newVal.trim() || payload[field];
      });
      usernameTitle.textContent = payload.username;
      alert("Profile updated");
      toggleMode(false);
      editMode = false;
    } catch (err) {
      console.error("Update error:", err);
      alert("Error updating profile: " + err.message);
    }
  });
});