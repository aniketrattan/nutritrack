const express = require("express");
const router = express.Router();
const pool = require("../DataBase/connection");
const multer = require("multer");
const path = require("path");

// Storage config for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../public/uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// GET /api/profile
router.get("/profile", async (req, res) => {
  const userId = req.session?.user_id;
  if (!userId) return res.status(401).json({ error: "Not logged in" });
  try {
    const [rows] = await pool.query(
      `SELECT username, email, age, sex,
              height_cm AS height, weight_kg AS weight,
              avatar_url, address
         FROM users WHERE user_id = ?`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/profile
router.post("/profile", async (req, res) => {
  const userId = req.session?.user_id;
  if (!userId) return res.status(401).json({ error: "Not logged in" });

  // destructure both user‐info and nutrition targets from the body
  const {
    age,
    sex,
    height_cm,
    weight_kg,
    address,
    calorie_target,
    protein_target,
    carb_target,
    fat_target,
  } = req.body;

  try {
    // 1) update basic user info
    await pool.query(
      `UPDATE users
          SET age       = COALESCE(?, age),
              sex       = COALESCE(NULLIF(?, ''), sex),
              height_cm = COALESCE(?, height_cm),
              weight_kg = COALESCE(?, weight_kg),
              address   = COALESCE(NULLIF(?, ''), address)
        WHERE user_id = ?`,
      [age, sex, height_cm, weight_kg, address, userId]
    );

    // 2) upsert nutrition targets
    await pool.query(
      `INSERT INTO nutrition_targets
         (user_id, daily_calorie_target, daily_protein_target,
          daily_carbohydrate_target, daily_fat_target, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY
         UPDATE daily_calorie_target      = VALUES(daily_calorie_target),
                daily_protein_target      = VALUES(daily_protein_target),
                daily_carbohydrate_target = VALUES(daily_carbohydrate_target),
                daily_fat_target          = VALUES(daily_fat_target),
                updated_at                = NOW()`,
      [
        userId,
        calorie_target,
        protein_target,
        carb_target,
        fat_target,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/profile/avatar
router.post("/profile/avatar", upload.single("avatar"), async (req, res) => {
  const userId = req.session?.user_id;
  if (!userId) return res.status(401).json({ error: "Not logged in" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/${req.file.filename}`;
  try {
    await pool.query(
      `UPDATE users SET avatar_url = ? WHERE user_id = ?`,
      [url, userId]
    );
    res.json({ success: true, avatarUrl: url });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
