const express = require("express");
const { fatSecretOAuth, fetchFoodDetails } = require("../lib/fatsecret");
const pool = require("../DataBase/connection");
const router = express.Router();

// “ensureAuth”
function ensureAuth(req, res, next) {
  if (req.session && req.session.user_id) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

// protect “foods.search”
router.get("/foods/search", ensureAuth, (req, res) => {
  const raw = (req.query.q || "").trim();
  if (!raw) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }
  // restrict characters:
  if (raw.length > 100) {
    return res.status(400).json({ error: "Search term too long." });
  }
  // Only allow letters, numbers, spaces, dashes
  if (!/^[a-zA-Z0-9\- ]+$/.test(raw)) {
    return res
      .status(400)
      .json({ error: "Invalid characters in search term." });
  }

  const apiUrl = [
    "https://platform.fatsecret.com/rest/server.api",
    "?method=foods.search",
    `&search_expression=${encodeURIComponent(raw)}`,
    "&format=json",
  ].join("");

  fatSecretOAuth.get(apiUrl, null, null, (err, data) => {
    if (err) {
      return res
        .status(502)
        .json({ error: "Failed to fetch from FatSecret", details: err });
    }
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (parseErr) {
      return res.status(502).json({
        error: "Invalid JSON from FatSecret",
        details: parseErr.message,
      });
    }
    if (parsed.error) {
      return res
        .status(502)
        .json({ error: "FatSecret API error", details: parsed.error });
    }

    const rawFoods = parsed.foods?.food
      ? Array.isArray(parsed.foods.food)
        ? parsed.foods.food
        : [parsed.foods.food]
      : [];

    const items = rawFoods.map((f) => ({
      food_id: f.food_id,
      food_name: f.food_name,
      food_description: f.food_description,
      photo: f.food_url,
    }));

    return res.json(items);
  });
});

// protect “foods/:id”
router.get("/foods/:id", ensureAuth, async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "Missing food ID" });
  }

  try {
    const fsRes = await fetchFoodDetails(id);
    if (!fsRes || !fsRes.food) {
      return res.status(404).json({ error: "Food not found" });
    }
    return res.json({ food: fsRes.food });
  } catch (err) {
    console.error("FatSecret lookup failed:", err);
    return res
      .status(502)
      .json({ error: "FatSecret lookup failed", details: err.message });
  }
});

// protect “db/foods/:id”
router.get("/db/foods/:id", ensureAuth, async (req, res) => {
  const food_id = req.params.id;
  if (!food_id) {
    return res.status(400).json({ error: "Missing food ID" });
  }

  try {
    const [foodRows] = await pool.query(
      `SELECT name AS food_name
         FROM foods
        WHERE food_id = ?`,
      [food_id]
    );
    if (!foodRows.length) {
      return res.status(404).json({ error: "Food not found" });
    }

    const [servRows] = await pool.query(
      `SELECT
         serving_id,
         description            AS serving_description,
         calories,
         fat,
         saturated_fat,
         mono_fat               AS monounsaturated_fat,
         poly_fat               AS polyunsaturated_fat,
         carbohydrate,
         fiber,
         sugar,
         protein,
         cholesterol,
         sodium,
         calcium,
         iron,
         potassium,
         vitamin_a_µg           AS vitamin_a,
         vitamin_c_mg           AS vitamin_c
       FROM servings
      WHERE food_id = ?`,
      [food_id]
    );

    return res.json({
      food: {
        food_id,
        food_name: foodRows[0].food_name,
        servings: { serving: servRows },
      },
    });
  } catch (err) {
    console.error("DB food lookup failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
