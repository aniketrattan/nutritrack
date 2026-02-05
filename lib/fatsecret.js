const OAuth = require("oauth").OAuth;

const fatSecretOAuth = new OAuth(
  null,
  null,
  process.env.FATSECRET_CONSUMER_KEY,
  process.env.FATSECRET_CONSUMER_SECRET,
  "1.0",
  null,
  "HMAC-SHA1"
);

/**
 * Fetch full food details via FatSecret’s food.get endpoint.
 * @param {string} foodId
 * @returns {Promise<object>} 
 */
function fetchFoodDetails(foodId) {
  const apiUrl = [
    "https://platform.fatsecret.com/rest/server.api",
    "?method=food.get",
    `&food_id=${encodeURIComponent(foodId)}`,
    "&format=json",
  ].join("");

  return new Promise((resolve, reject) => {
    fatSecretOAuth.get(apiUrl, null, null, (err, data) => {
      if (err) return reject(err);
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch (parseErr) {
        return reject(parseErr);
      }
      if (parsed.error) return reject(new Error(parsed.error));
      resolve({ food: parsed.food });
    });
  });
}

module.exports = { fatSecretOAuth, fetchFoodDetails };
