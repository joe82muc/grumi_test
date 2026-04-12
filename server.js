const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
      class_name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS topics (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subject TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attempts (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      total_questions INT NOT NULL,
      correct_answers INT NOT NULL,
      percent NUMERIC(5,2) NOT NULL,
      grade NUMERIC(2,1) NOT NULL,
      subject TEXT NOT NULL DEFAULT 'NT',
      finished_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, topic_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attempt_answers (
      id SERIAL PRIMARY KEY,
      attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      selected_option CHAR(1) NOT NULL CHECK (selected_option IN ('A','B','C','D')),
      is_correct BOOLEAN NOT NULL
    );
  `);

  await pool.query(`
    INSERT INTO topics (title, subject)
    SELECT 'C14 Methode', 'NT'
    WHERE NOT EXISTS (
      SELECT 1 FROM topics WHERE title='C14 Methode' AND subject='NT'
    );
  `);
}

app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS now");
    res.json({ ok: true, db: true, now: r.rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, db: false, error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const q = await pool.query(
      "SELECT id, username, role, password_hash FROM users WHERE username = $1",
      [username]
    );

    if (q.rows.length === 0) return res.status(401).json({ error: "Ungültige Daten" });

    const user = q.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Ungültige Daten" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB init failed:", err);
    process.exit(1);
  });
