function togglePassword() {
    const pwd = document.getElementById("password");
    pwd.type = pwd.type === "password" ? "text" : "password";
  }

  function toggleConfirmPassword() {
    const cpwd = document.getElementById("confirmPassword");
    cpwd.type = cpwd.type === "password" ? "text" : "password";
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    const errorMsg = document.getElementById("error-message");

    form.addEventListener("submit", function (event) {
      const pwd = document.getElementById("password").value.trim();
      const cpwd = document.getElementById("confirmPassword").value.trim();

      errorMsg.textContent = "";

      if (pwd !== cpwd) {
        event.preventDefault();
        errorMsg.textContent = "Passwords do not match. Please re-enter.";
      }
    });
  });
