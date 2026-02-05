const express = require("express");
const router = express.Router();
const pool = require("../DataBase/connection");

const { fetchFoodDetails } = require("../lib/fatsecret");

router.get("/mealplan/list", async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    const [plans] = await pool.query(
      `SELECT plan_id, name
         FROM meal_plans
        WHERE user_id = ?
        ORDER BY created_at`,
      [userId]
    );
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

router.get("/mealplan/:planId/items", async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const planId = req.params.planId;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    const [planRows] = await pool.query(
      `SELECT plan_id, name
         FROM meal_plans
        WHERE plan_id = ? AND user_id = ?`,
      [planId, userId]
    );
    if (!planRows.length) return res.status(403).json({ error: "Forbidden" });
    const plan = planRows[0];

    const [items] = await pool.query(
      `SELECT
              mpi.item_id            AS id,
              mpi.meal_type,
              f.food_id              AS food_id,
              f.name                 AS food_name,
             s.serving_id           AS serving_id,
              s.description          AS serving_description,
              mpi.quantity,
              s.calories,
              s.protein              AS protein,
              s.carbohydrate         AS carbs,
              s.fat                  AS fat
            FROM meal_plan_items mpi
            JOIN servings s ON s.serving_id = mpi.serving_id
            JOIN foods    f ON f.food_id    = s.food_id
           WHERE mpi.plan_id = ?
           ORDER BY FIELD(mpi.meal_type, 'breakfast','lunch','dinner','snack'), mpi.added_at`,
      [planId]
    );

    res.json({ plan, items });
  } catch (err) {
    next(err);
  }
});

router.get("/mealplan/:planId/summary", async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const planId = req.params.planId;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    const [chk] = await pool.query(
      `SELECT 1
         FROM meal_plans
        WHERE plan_id = ? AND user_id = ?`,
      [planId, userId]
    );
    if (!chk.length) return res.status(403).json({ error: "Forbidden" });

    const [totalsRows] = await pool.query(
      `SELECT
         SUM(s.protein      * mpi.quantity) AS protein,
         SUM(s.carbohydrate * mpi.quantity) AS carbs,
         SUM(s.fat          * mpi.quantity) AS fat
       FROM meal_plan_items mpi
       JOIN servings s ON s.serving_id = mpi.serving_id
      WHERE mpi.plan_id = ?`,
      [planId]
    );

    const [targetsRows] = await pool.query(
      `SELECT
         daily_protein_target      AS protein,
         daily_carbohydrate_target AS carbs,
         daily_fat_target          AS fat
       FROM nutrition_targets
      WHERE user_id = ?`,
      [userId]
    );

    res.json({
      totals: totalsRows[0] || { protein: 0, carbs: 0, fat: 0 },
      targets: targetsRows[0] || { protein: 0, carbs: 0, fat: 0 },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/mealplan", async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name is required" });

    const [result] = await pool.query(
      `INSERT INTO meal_plans
         (user_id, name, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())`,
      [userId, name]
    );

    const newPlan = { plan_id: result.insertId, name };
    res.status(201).json({ plan: newPlan });
  } catch (err) {
    next(err);
  }
});

router.post("/mealplan/items", async (req, res, next) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { plan_id, food_id, serving_id, quantity, meal_type } = req.body;
  if (!plan_id || !food_id || !serving_id || !quantity || !meal_type) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  // Confirm plan belongs to this user
  try {
    const [planRows] = await pool.query(
      `SELECT 1
         FROM meal_plans
        WHERE plan_id = ? AND user_id = ?`,
      [plan_id, userId]
    );
    if (!planRows.length) {
      return res.status(403).json({ error: "Forbidden" });
    }
  } catch (err) {
    return next(err);
  }

  // Begin transaction to cache food/servings and insert meal_plan_items
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Fetch live FatSecret data
    const apiRes = await fetchFoodDetails(food_id);
    const servArray = Array.isArray(apiRes.food.servings.serving)
      ? apiRes.food.servings.serving
      : [apiRes.food.servings.serving];

    // Upsert into foods
    await conn.query(
      `INSERT INTO foods (food_id, name)
         VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [food_id, apiRes.food.food_name]
    );

    // Replace all servings for this food
    await conn.query(`DELETE FROM servings WHERE food_id = ?`, [food_id]);

    const servingsValues = servArray.map((s) => [
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
      [servingsValues]
    );

    // Finally, insert into meal_plan_items
    await conn.query(
      `INSERT INTO meal_plan_items
         (plan_id, serving_id, quantity, meal_type, added_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [plan_id, serving_id, quantity, meal_type]
    );

    await conn.commit();
    res.status(201).json({ success: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.get("/mealplan/summary", async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    const [byMeal] = await pool.query(
      `SELECT
         mpi.meal_type,
         SUM(s.calories     * mpi.quantity) AS calories,
         SUM(s.protein      * mpi.quantity) AS protein,
         SUM(s.carbohydrate * mpi.quantity) AS carbs,
         SUM(s.fat          * mpi.quantity) AS fat
       FROM meal_plan_items mpi
       JOIN servings s ON s.serving_id = mpi.serving_id
      WHERE mpi.plan_id = (
        SELECT plan_id
          FROM meal_plans
         WHERE user_id = ?
         ORDER BY created_at
         LIMIT 1
      )
      GROUP BY mpi.meal_type`,
      [userId]
    );

    const [targetsRows] = await pool.query(
      `SELECT
         daily_calorie_target   AS calories,
         daily_protein_target   AS protein,
         daily_carbohydrate_target AS carbs,
         daily_fat_target       AS fat
       FROM nutrition_targets
      WHERE user_id = ?`,
      [userId]
    );

    res.json({ byMeal, targets: targetsRows[0] || {} });
  } catch (err) {
    next(err);
  }
});

// DELETE an item
router.delete("/mealplan/items/:itemId", async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    const itemId = req.params.itemId;

    const [check] = await pool.query(
      `SELECT mpi.item_id
         FROM meal_plan_items mpi
         JOIN meal_plans mp ON mpi.plan_id = mp.plan_id
        WHERE mpi.item_id = ? AND mp.user_id = ?`,
      [itemId, userId]
    );
    if (!check.length) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query(`DELETE FROM meal_plan_items WHERE item_id = ?`, [itemId]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE meal plan
router.delete("/mealplan/:planId", async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    const planId = req.params.planId;
    const [check] = await pool.query(
      `SELECT 1
         FROM meal_plans
        WHERE plan_id = ? AND user_id = ?`,
      [planId, userId]
    );
    if (!check.length) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query(`DELETE FROM meal_plans WHERE plan_id = ?`, [planId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
