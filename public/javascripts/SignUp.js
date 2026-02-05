// signup.js
console.log("SignUp.js loaded");

document.addEventListener("DOMContentLoaded", function () {
  const form               = document.querySelector("form");
  const passwordInput      = document.getElementById("password");
  const meter              = document.getElementById("strength-meter");
  const strengthText       = document.getElementById("strength-text");
  const strengthContainer  = document.querySelector(".password-strength");
  const passwordError      = document.getElementById("password-error-message");
  const errorMsg           = document.getElementById("error-message");

  // hide strength indicator
  strengthContainer.style.display = "none";

  // show/hide indicator on focus/blur
  passwordInput.addEventListener("focus", () => {
    strengthContainer.style.display = "flex";
  });

  passwordInput.addEventListener("blur", () => {
    if (!passwordInput.value) {
      strengthContainer.style.display = "none";
    }
  });


  let currentScore = 0;

  function calcScore(val) {
    let score = 0;

    // length points
    if (val.length <= 4)       score += 5;
    else if (val.length <= 7)  score += 10;
    else                        score += 25;

    // letter points
    const hasLower = /[a-z]/.test(val);
    const hasUpper = /[A-Z]/.test(val);
    if (hasLower && hasUpper)  score += 20;
    else if (hasLower || hasUpper) score += 10;

    // number points
    const numCount = (val.match(/[0-9]/g) || []).length;
    if (numCount === 1)        score += 10;
    else if (numCount > 1)     score += 20;

    // symbol points
    const symCount = (val.match(/[^A-Za-z0-9]/g) || []).length;
    if (symCount === 1)        score += 10;
    else if (symCount > 1)     score += 25;

    // bonus points
    if ((hasLower || hasUpper) && numCount > 0) {
      score += symCount > 0
        ? (hasLower && hasUpper ? 5 : 3)
        : 2;
    }

    currentScore = score;
    return score;
  }


  function getCategory(score) {
    if (score >= 90) return "Very_Secure";
    if (score >= 80) return "Secure";
    if (score >= 70) return "Very_Strong";
    if (score >= 60) return "Strong";
    if (score >= 50) return "Average";
    if (score >= 25) return "Weak";
    return "Very_Weak";
  }


  function updateStrength() {
    const score    = calcScore(passwordInput.value);
    const category = getCategory(score);

    meter.max       = 100;
    meter.value     = score;
    strengthText.textContent = `Strength: ${category}`;
  }

  passwordInput.addEventListener("input", updateStrength);
  passwordInput.addEventListener("keyup",  updateStrength);


  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // block if strength < Average
    if (currentScore < 50) {
      passwordError.textContent = "Password strength too low";
      return;
    }

    passwordError.textContent = "";
    errorMsg.textContent      = "";

    const username        = document.querySelector('input[placeholder="Name"]').value.trim();
    const email           = document.querySelector('input[placeholder="Email"]').value.trim();
    const password        = passwordInput.value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (password !== confirmPassword) {
      errorMsg.textContent = "Passwords do not match";
      return;
    }

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();

      if (res.ok) {
        alert("Registration successful");
        window.location.href = "/Login.html";
      } else {
        errorMsg.textContent = data.error || "Sign up failed";
      }
    } catch {
      errorMsg.textContent = "Connection error";
    }
  });

});
