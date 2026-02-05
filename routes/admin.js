const express = require('express');
const router = express.Router();
const pool = require('../DataBase/connection');
const crypto = require('crypto');
const { promisify } = require('util');

// Middleware: only allow logged-in admins
router.use((req, res, next) => {
  if (!req.session?.user_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

// GET all users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, username, email, age, sex, avatar_url FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// POST new user
router.post('/users', async (req, res) => {
  const { username, email, age, sex } = req.body;
  const numericAge = age ? parseInt(age, 10) : null;

  const password = 'admin123';
  const scrypt = promisify(crypto.scrypt);
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  const passwordHash = `${salt}:${derivedKey.toString('hex')}`;

  try {
    await pool.query(
      `INSERT INTO users (username, email, password_hash, age, sex, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'user', NOW(), NOW())`,
      [username, email, passwordHash, numericAge, sex]
    );
    res.status(201).json({ message: 'User added' });
  } catch (err) {
    console.error('insert error', err);

    // check if the user already exits
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('username')) {
        return res.status(400).json({ error: 'User already exits' });
      } if (err.message.includes('email')) {
        return res.status(400).json({ error: 'Email already in use' });
      } if (err.message.includes('user_id')) {
        return res.status(400).json({ error: 'User ID already in use' });
      }
      return res.status(400).json({ error: 'Duplicate user information' });
    }
    return res.status(500).json({ error: 'Insert error', details: err.message });
  }

});


// PUT update user
router.put('/users/:id', async (req, res) => {
  const { username, email, age, sex } = req.body;
  const numericAge = age ? parseInt(age, 10) : null;

  const allowedSex = ['male', 'female', 'other'];
  const sexValue = allowedSex.includes((sex || '').toLowerCase())
    ? sex.toLowerCase()
    : null;

  try {
    await pool.query(
      `UPDATE users
       SET username = ?, email = ?, age = ?, sex = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [username, email, numericAge, sexValue, req.params.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ update failed:', err);
    res.status(500).json({ error: 'Update error', details: err.message });
  }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Delete error' });
  }
});

module.exports = router;
