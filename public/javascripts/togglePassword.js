function togglePassword() {
    const pwd = document.getElementById("password");
    if (!pwd) return;
    pwd.type = pwd.type === "password" ? "text" : "password";
  }