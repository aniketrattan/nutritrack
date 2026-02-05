// Hide the UI until we verify session & profile state
document.documentElement.style.visibility = "hidden";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const resp = await fetch("/api/profile", {
      method: "GET",
      credentials: "include", // send session cookie
      headers: { Accept: "application/json" },
    });
    if (resp.status === 401) {
      return (window.location.href = "/Login.html");
    }
    const user = await resp.json();
    if (user.age && user.sex && user.height && user.weight) {
      return (window.location.href = "/home.html");
    }
  } catch (err) {
    console.error("Could not verify profile status:", err);
    // fall through to show wizard
  }

  // Reveal the wizard UI 
  document.documentElement.style.visibility = "visible";

  const steps = [
    document.getElementById("step-1"),
    document.getElementById("step-2"),
    document.getElementById("step-3"),
  ];
  const progress = document.getElementById("progress");
  function showStep(i) {
    steps.forEach((s, idx) => s.classList.toggle("hidden", idx !== i));
    progress.style.width = `${((i + 1) / steps.length) * 100}%`;
  }
  showStep(0);

  const ageEl = document.getElementById("age");
  const sexEl = document.getElementById("sex");
  const heightEl = document.getElementById("height");
  const weightEl = document.getElementById("weight");
  const next1 = document.getElementById("next-1");
  function validateStep1() {
    next1.disabled = !(
      ageEl.value &&
      sexEl.value &&
      heightEl.value &&
      weightEl.value
    );
  }
  [ageEl, sexEl, heightEl, weightEl].forEach((el) =>
    el.addEventListener("input", validateStep1)
  );
  next1.addEventListener("click", () => showStep(1));

  let activityFactor = null;
  const activityBtns = document.querySelectorAll(".activity-btn");
  const prev2 = document.getElementById("prev-2");
  const next2 = document.getElementById("next-2");
  activityBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      activityBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      activityFactor = parseFloat(btn.dataset.mult);
      next2.disabled = false;
    });
  });
  prev2.addEventListener("click", () => showStep(0));
  next2.addEventListener("click", () => {
    calculateTargets();
    showStep(2);
  });

  const targetCal = document.getElementById("targetCalories");
  const targetPro = document.getElementById("targetProtein");
  const targetFat = document.getElementById("targetFat");
  const targetCarb = document.getElementById("targetCarbs");
  const customizeBtn = document.getElementById("customizeTargets");
  const nutriInputs = document.querySelector(".nutrient-inputs");
  const calIn = document.getElementById("calories");
  const proIn = document.getElementById("protein");
  const fatIn = document.getElementById("fat");
  const carbIn = document.getElementById("carbs");
  const prev3 = document.getElementById("prev-3");
  const submitBtn = document.getElementById("submit-profile");

  let finalTargets = {};

  prev3.addEventListener("click", () => showStep(1));
  customizeBtn.addEventListener("click", () => {
    const showing = nutriInputs.classList.toggle("hidden");
    if (showing) {
      calIn.value = finalTargets.calories;
      proIn.value = finalTargets.protein;
      fatIn.value = finalTargets.fat;
      carbIn.value = finalTargets.carbs;
      validateCustom();
    }
  });
  function validateCustom() {
    submitBtn.disabled = !(
      calIn.value &&
      proIn.value &&
      fatIn.value &&
      carbIn.value
    );
  }
  [calIn, proIn, fatIn, carbIn].forEach((el) =>
    el.addEventListener("input", validateCustom)
  );

  submitBtn.addEventListener("click", async () => {
    const useCustom = !nutriInputs.classList.contains("hidden");
    const payload = {
      age: parseInt(ageEl.value, 10),
      sex: sexEl.value,
      height_cm: parseInt(heightEl.value, 10),
      weight_kg: parseInt(weightEl.value, 10),
      calorie_target: useCustom
        ? parseInt(calIn.value, 10)
        : finalTargets.calories,
      protein_target: useCustom
        ? parseInt(proIn.value, 10)
        : finalTargets.protein,
      fat_target: useCustom ? parseInt(fatIn.value, 10) : finalTargets.fat,
      carb_target: useCustom ? parseInt(carbIn.value, 10) : finalTargets.carbs,
    };
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        credentials: "include", // ← include session cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      alert("Profile saved successfully!");
      window.location.href = "/home.html";
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Error saving profile: " + err.message);
    }
  });

  // — Calculation Logic —
  function calculateTargets() {
    const age = parseFloat(ageEl.value);
    const height = parseFloat(heightEl.value);
    const weight = parseFloat(weightEl.value);

    let bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    let cal = Math.round(bmr * activityFactor);
    const bmi = weight / (height / 100) ** 2;
    if (bmi >= 25) cal -= 500;
    else if (bmi < 18.5) cal += 500;

    const protein = Math.round((cal * 0.25) / 4);
    const fat = Math.round((cal * 0.25) / 9);
    const carbs = Math.round((cal * 0.5) / 4);

    finalTargets = { calories: cal, protein, fat, carbs };

    targetCal.textContent = cal;
    targetPro.textContent = protein;
    targetFat.textContent = fat;
    targetCarb.textContent = carbs;

    submitBtn.disabled = false;
  }

  // Avatar Upload 
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");

  avatarInput.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file || !file.type.startsWith("image/")) {
      return alert("Please select a valid image file.");
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarPreview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        credentials: "include", // ← include session cookie
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        console.log("✅ Avatar uploaded:", data.avatarUrl);
      } else {
        console.error("❌ Upload error:", data.error);
        alert("Avatar upload failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Avatar upload failed.");
    }
  });
});
