const express = require("express");
const router = express.Router();
const pool = require("../DataBase/connection");
const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);

// User Registration
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Check if username or email already exists
  const [existing] = await pool.query(
    "SELECT user_id FROM users WHERE username = ? OR email = ?",
    [username, email]
  );
  if (existing.length) {
    return res.status(409).json({ error: "Username or email already in use" });
  }

  // Hash the password
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  const passwordHash = `${salt}:${derivedKey.toString("hex")}`;

  // Count existing users
  const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM users");
  const roleToAssign = count === 0 ? "admin" : "user";

  // Insert new user with dynamic role
  await pool.query(
    `INSERT INTO users
      (username, email, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [username, email, passwordHash, roleToAssign]
  );

  return res.status(201).json({ message: "Registration successful" });
});

// User Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // Find user by email
  const [rows] = await pool.query(
    "SELECT user_id, password_hash, role FROM users WHERE email = ?",
    [email]
  );
  if (!rows.length) {
    return res
      .status(401)
      .json({ error: "Please input the correct email address." });
  }

  const { user_id, password_hash, role } = rows[0];

  // Verify password
  const [salt, key] = password_hash.split(":");
  const derivedKey = (await scrypt(password, salt, 64)).toString("hex");
  if (
    !crypto.timingSafeEqual(
      Buffer.from(key, "hex"),
      Buffer.from(derivedKey, "hex")
    )
  ) {
    return res.status(401).json({ error: "Please enter the password again." });
  }

  // Store user ID in session
  req.session.user_id = user_id;
  req.session.role    = role;

  // Check if the user already has a nutrition profile
  const [profiles] = await pool.query(
    `SELECT 1 FROM nutrition_targets WHERE user_id = ?`,
    [user_id]
  );
  const status = profiles.length > 0 ? "old" : "new";

  return res.json({ message: "Login successful", status, role });
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Unable to logout" });
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out" });
  });
});

// Session Status Check
router.get("/status", (req, res) => {
  if (req.session && req.session.user_id) {
    return res.json({
      user_id: req.session.user_id,
      message: "Authenticated",
    });
  }
  return res.status(401).json({ error: "Unauthorized" });
});

// GET /logout — destroy session and redirect to public home
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Unable to log out");
    }
    // clearCookie using same name & path as express-session
    res.clearCookie("connect.sid", {
      httpOnly: true,
      sameSite: "lax",    
      secure: false       
    });
    res.redirect("/home.html");
  });
});


module.exports = router;
