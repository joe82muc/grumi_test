const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const QUIZ_QUESTION_COUNT = 20;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function calcGrade(percent) {
  if (percent >= 92) return 1.0;
  if (percent >= 81) return 2.0;
  if (percent >= 67) return 3.0;
  if (percent >= 50) return 4.0;
  if (percent >= 30) return 5.0;
  return 6.0;
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Nicht eingeloggt" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token ungültig oder abgelaufen" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Keine Berechtigung" });
    }
    next();
  };
}

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
    INSERT INTO users (username, password_hash, role, class_name)
    SELECT 'lehrer', $1, 'teacher', '9M'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='lehrer')
  `, [await bcrypt.hash("Lehrer123!", 10)]);

  await pool.query(`
    INSERT INTO users (username, password_hash, role, class_name)
    SELECT 's1', $1, 'student', '9M'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='s1')
  `, [await bcrypt.hash("Schueler1!", 10)]);

  await pool.query(`
    INSERT INTO users (username, password_hash, role, class_name)
    SELECT 's2', $1, 'student', '9M'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='s2')
  `, [await bcrypt.hash("Schueler2!", 10)]);
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
    if (!username || !password) {
      return res.status(400).json({ error: "username und password erforderlich" });
    }

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

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/me", auth, async (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/topics", auth, async (req, res) => {
  try {
    const q = await pool.query("SELECT id, title, subject FROM topics ORDER BY id");
    res.json(q.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/topics/:topicId/questions", auth, async (req, res) => {
  try {
    const topicId = Number(req.params.topicId);
    if (!topicId) return res.status(400).json({ error: "Ungültige topicId" });

    if (req.user.role === "student") {
      const already = await pool.query(
        "SELECT 1 FROM attempts WHERE student_id = $1 AND topic_id = $2",
        [req.user.id, topicId]
      );
      if (already.rows.length > 0) {
        return res.status(409).json({ error: "Test bereits absolviert" });
      }
    }

    const q = await pool.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d
       FROM questions
       WHERE topic_id = $1
       ORDER BY id
       LIMIT $2`,
      [topicId, QUIZ_QUESTION_COUNT]
    );

    res.json({ topicId, questions: q.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/topics/:topicId/submit", auth, requireRole("student"), async (req, res) => {
  const client = await pool.connect();
  try {
    const topicId = Number(req.params.topicId);
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    if (!topicId) return res.status(400).json({ error: "Ungültige topicId" });

    const already = await client.query(
      "SELECT 1 FROM attempts WHERE student_id = $1 AND topic_id = $2",
      [req.user.id, topicId]
    );
    if (already.rows.length > 0) {
      return res.status(409).json({ error: "Test bereits absolviert" });
    }

    const q = await client.query(
      `SELECT id, correct_option
       FROM questions
       WHERE topic_id = $1
       ORDER BY id
       LIMIT $2`,
      [topicId, QUIZ_QUESTION_COUNT]
    );

    if (q.rows.length !== QUIZ_QUESTION_COUNT) {
      return res.status(400).json({
        error: `Für dieses Thema sind keine ${QUIZ_QUESTION_COUNT} Fragen hinterlegt`
      });
    }

    const answerMap = new Map();
    for (const a of answers) {
      if (!a || !a.questionId || !a.selectedOption) continue;
      answerMap.set(Number(a.questionId), String(a.selectedOption).toUpperCase());
    }

    let correct = 0;
    const detailed = q.rows.map((row) => {
      const selected = answerMap.get(row.id) || "A";
      const isCorrect = selected === row.correct_option;
      if (isCorrect) correct += 1;
      return {
        questionId: row.id,
        selectedOption: selected,
        isCorrect
      };
    });

    const total = q.rows.length;
    const percent = Number(((correct / total) * 100).toFixed(2));
    const grade = calcGrade(percent);

    await client.query("BEGIN");

    const insAttempt = await client.query(
      `INSERT INTO attempts
       (student_id, topic_id, total_questions, correct_answers, percent, grade, subject)
       VALUES ($1, $2, $3, $4, $5, $6, 'NT')
       RETURNING id`,
      [req.user.id, topicId, total, correct, percent, grade]
    );

    const attemptId = insAttempt.rows[0].id;

    for (const d of detailed) {
      await client.query(
        `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_correct)
         VALUES ($1, $2, $3, $4)`,
        [attemptId, d.questionId, d.selectedOption, d.isCorrect]
      );
    }

    await client.query("COMMIT");

    res.json({
      saved: true,
      attemptId,
      totalQuestions: total,
      correctAnswers: correct,
      percent,
      grade
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ error: "Test bereits absolviert" });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/my-results", auth, requireRole("student"), async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT a.id, a.topic_id, t.title, a.subject, a.total_questions, a.correct_answers, a.percent, a.grade, a.finished_at
       FROM attempts a
       JOIN topics t ON t.id = a.topic_id
       WHERE a.student_id = $1
       ORDER BY a.finished_at DESC`,
      [req.user.id]
    );
    res.json(q.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/teacher/results", auth, requireRole("teacher"), async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT
         a.id AS attempt_id,
         u.username AS student_username,
         u.class_name,
         t.title AS topic_title,
         a.subject,
         a.correct_answers,
         a.total_questions,
         a.percent,
         a.grade,
         a.finished_at
       FROM attempts a
       JOIN users u ON u.id = a.student_id
       JOIN topics t ON t.id = a.topic_id
       ORDER BY a.finished_at DESC`
    );
    res.json(q.rows);
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
