const express = require("express");
const router = express.Router();
const pool = require("../DataBase/connection");
const { fetchFoodDetails } = require("../lib/fatsecret");
const multer = require("multer");
const path = require("path");

// upload profile-image
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/profile", async (req, res, next) => {
  const {
    email,
    age,
    sex,
    height_cm,
    weight_kg,
    calorie_target,
    protein_target,
    carb_target,
    fat_target,
  } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }

  try {
    await pool.query(
      `UPDATE users
        SET age = ?, sex = ?, height_cm = ?, weight_kg = ?
      WHERE email = ?`,
      [age, sex, height_cm, weight_kg, email]
    );

    const [users] = await pool.query(
      `SELECT user_id FROM users WHERE email = ?`,
      [email]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user_id = users[0].user_id;

    await pool.query(
      `INSERT INTO nutrition_targets
         (user_id, daily_calorie_target, daily_protein_target,
          daily_carbohydrate_target, daily_fat_target, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         daily_calorie_target      = VALUES(daily_calorie_target),
         daily_protein_target      = VALUES(daily_protein_target),
         daily_carbohydrate_target = VALUES(daily_carbohydrate_target),
         daily_fat_target          = VALUES(daily_fat_target),
         updated_at                = NOW()`,
      [user_id, calorie_target, protein_target, carb_target, fat_target]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/profile", async (req, res, next) => {
  const user_id = req.session?.user_id;
  if (!user_id) return res.status(401).json({ error: "please log in first" });

  try {
    const [[user]] = await pool.query(
      `SELECT username, email, age, sex, height_cm AS height, weight_kg AS weight
       FROM users
       WHERE user_id = ?`,
      [user_id]
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    next(err);
  }
});


router.post("/favorites", async (req, res) => {
  try {
    const userId = req.session?.user_id;
    if (!userId)
      return res.status(401).json({ error: "You must be logged in." });

    const { food_id } = req.body;
    if (!food_id) return res.status(400).json({ error: "Missing food_id." });

    const food = await fetchFoodDetails(food_id);

    await pool.query(
      `INSERT INTO foods (food_id, name, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         updated_at = NOW()`,
      [food_id, food.food_name]
    );

    const serveSql = `
      INSERT INTO servings (
        serving_id, food_id, description,
        calories, fat, saturated_fat, mono_fat, poly_fat,
        carbohydrate, fiber, sugar, protein,
        cholesterol, sodium, calcium, iron, potassium,
        vitamin_a_µg, vitamin_c_mg,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
      )
      ON DUPLICATE KEY UPDATE
        description      = VALUES(description),
        calories         = VALUES(calories),
        fat              = VALUES(fat),
        saturated_fat    = VALUES(saturated_fat),
        mono_fat         = VALUES(mono_fat),
        poly_fat         = VALUES(poly_fat),
        carbohydrate     = VALUES(carbohydrate),
        fiber            = VALUES(fiber),
        sugar            = VALUES(sugar),
        protein          = VALUES(protein),
        cholesterol      = VALUES(cholesterol),
        sodium           = VALUES(sodium),
        calcium          = VALUES(calcium),
        iron             = VALUES(iron),
        potassium        = VALUES(potassium),
        vitamin_a_µg     = VALUES(vitamin_a_µg),
        vitamin_c_mg     = VALUES(vitamin_c_mg),
        updated_at       = NOW()
    `;
    const servs = Array.isArray(food.servings.serving)
      ? food.servings.serving
      : [food.servings.serving];

    for (const s of servs) {
      await pool.query(serveSql, [
        s.serving_id,
        food_id,
        s.serving_description,
        s.calories,
        s.fat,
        s.saturated_fat,
        s.monounsaturated_fat,
        s.polyunsaturated_fat,
        s.carbohydrate,
        s.fiber,
        s.sugar,
        s.protein,
        s.cholesterol,
        s.sodium,
        s.calcium,
        s.iron,
        s.potassium,
        s.vitamin_a_µg,
        s.vitamin_c_mg,
      ]);
    }

    await pool.query(
      `INSERT INTO user_favorites (user_id, food_id, favorited_at)
         VALUES (?, ?, NOW())`,
      [userId, food_id]
    );

    res.status(201).json({ message: "Added to Favorites and cached!" });
  } catch (err) {
    console.error("Favorite error:", err);
    res.status(500).json({ error: err.message });
  }
});

// upload the profile-image
router.post("/profile/avatar", upload.single("avatar"), async (req, res) => {
  const userId = req.session?.user_id; // make sure the user is already login
  if (!userId) {
    return res.status(401).json({ error: "User not logged in" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No avatar file uploaded" });
  }

  const avatarUrl = `/uploads/${req.file.filename}`;

  try {
    await pool.query(
      `UPDATE users SET avatar_url = ? WHERE user_id = ?`,
      [avatarUrl, userId]
    );

    res.json({ success: true, avatarUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Database update failed" });
  }
});


module.exports = router;
