const express = require("express");
const pool = require("../DataBase/connection");
const { fetchFoodDetails } = require("../lib/fatsecret");
const router = express.Router();

function ensureAuth(req, res, next) {
  if (req.session?.user_id) return next();
  res.status(401).json({ error: "Unauthorized" });
}
router.get("/favorites", ensureAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.food_id, f.name
         FROM user_favorites uf
         JOIN foods         f ON uf.food_id = f.food_id
        WHERE uf.user_id = ?`,
      [req.session.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch favorites:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/favorites", ensureAuth, async (req, res) => {
  const { food_id } = req.body;
  if (!food_id) return res.status(400).json({ error: "Missing food_id" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const apiRes = await fetchFoodDetails(food_id);
    const servs = Array.isArray(apiRes.food.servings.serving)
      ? apiRes.food.servings.serving
      : [apiRes.food.servings.serving];

    await conn.query(
      `INSERT INTO foods (food_id, name)
         VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name)`,
      [food_id, apiRes.food.food_name]
    );

    await conn.query(`DELETE FROM servings WHERE food_id = ?`, [food_id]);

    const insertValues = servs.map((s) => [
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
      s.vitamin_a,
      s.vitamin_c,
    ]);

    await conn.query(
      `INSERT INTO servings (
         serving_id, food_id, description,
         calories, fat, saturated_fat,
         mono_fat, poly_fat,
         carbohydrate, fiber, sugar,
         protein, cholesterol, sodium,
         calcium, iron, potassium,
         vitamin_a_µg, vitamin_c_mg
       ) VALUES ?`,
      [insertValues]
    );

    await conn.query(
      `INSERT IGNORE INTO user_favorites
         (user_id, food_id, favorited_at)
       VALUES (?, ?, NOW())`,
      [req.session.user_id, food_id]
    );

    await conn.commit();
    res.sendStatus(201);
  } catch (err) {
    await conn.rollback();
    console.error("Error caching favorite:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

router.delete("/favorites/:food_id", ensureAuth, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM user_favorites
             WHERE user_id = ? AND food_id = ?`,
      [req.session.user_id, req.params.food_id]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("Failed to delete favorite:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
