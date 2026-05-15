require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use(cors());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// ── AUTH ROUTES ──────────────────────────────────────────

// SIGN UP
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
        return res.status(400).json({ error: 'All fields required' });

    try {
        const hashed = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
        stmt.run(username, email, hashed);
        res.json({ message: 'Account created!' });
    } catch (err) {
        res.status(400).json({ error: 'Username or email already exists' });
    }
});

// SIGN IN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ message: 'Logged in!', username: user.username });
});

// LOGOUT
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// CHECK SESSION
app.get('/api/me', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
    res.json({ username: req.session.username, id: req.session.userId });
});

// ── QUIZ ROUTES ──────────────────────────────────────────

// Generate quiz questions using Groq
app.post('/api/generate-quiz', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });

    const { topic, numQuestions = 5 } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    const prompt = `Generate ${numQuestions} multiple choice quiz questions about "${topic}".
Return ONLY a valid JSON array. No explanation, no markdown, just the raw JSON.
Format:
[
  {
    "question": "Question text here?",
    "options": ["A) Option1", "B) Option2", "C) Option3", "D) Option4"],
    "answer": "A) Option1"
  }
]`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model:'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        console.log('Groq response:', JSON.stringify(data, null, 2));

        if (data.error) {
            console.error('Groq API error:', data.error.message);
            return res.status(500).json({ error: `Groq error: ${data.error.message}` });
        }

        let text = data.choices[0].message.content;
        text = text.replace(/```json|```/g, '').trim();

        const questions = JSON.parse(text);
        res.json({ questions });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Failed to generate quiz' });
    }
});

// Save quiz result
app.post('/api/save-result', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
    const { topic, score, total } = req.body;
    db.prepare('INSERT INTO quiz_results (user_id, topic, score, total) VALUES (?, ?, ?, ?)')
        .run(req.session.userId, topic, score, total);
    res.json({ message: 'Result saved!' });
});

// Get user's quiz history
app.get('/api/history', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
    const results = db.prepare(
        'SELECT * FROM quiz_results WHERE user_id = ? ORDER BY taken_at DESC LIMIT 10'
    ).all(req.session.userId);
    res.json({ results });
});

// ── START SERVER ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));