const express = require('express'); 
require('dotenv').config();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const port = process.env.PORT || 3000;
const app = express();

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// ===== MySQL Connection =====
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to MySQL database');
});

// ===== Utility Functions =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    next();
  };
}

// ===== HTML Routes =====
app.get(['/', '/home'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/assignExam', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reg.html'));
});

app.get('/update-user', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'update-user.html'));
});

app.get(['/dashboard', '/student-dashboard', '/student-results', '/forgot-password'], (req, res) => {
  const mapping = {
    '/dashboard': 'dashboard/dashboard.html',
    '/student-dashboard': 'dashboard/student-dashboard.html',
    '/student-results': 'student-result.html',
    '/forgot-password': 'forgot-password.html'
  };
  res.sendFile(path.join(__dirname, 'public', mapping[req.path]));
});

// ===== API Routes =====

// Get next user ID
app.get('/api/next-id/:role', (req, res) => {
  const role = req.params.role;
  const prefixMap = { student: 'UABS', staff: 'UABT', admin: 'UABA' };
  if (!prefixMap[role]) return res.status(400).json({ error: 'Invalid role' });

  db.query(
    'SELECT roleSpecificField FROM registrations WHERE role = ? ORDER BY id DESC LIMIT 1',
    [role],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      let nextNumber = 1;
      if (result.length > 0) {
        const numericPart = parseInt(result[0].roleSpecificField.replace(/\D/g, ''), 10);
        nextNumber = numericPart + 1;
      }

      const nextId = `${prefixMap[role]}${String(nextNumber).padStart(4, '0')}`;
      res.json({ nextId });
    }
  );
});

// Register user (admin only)
app.post('/register', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { role, fullName, email, password, department, level } = req.body;
  if (!role || !fullName || !email || !password) return res.status(400).send('All fields required');
  if (role === 'student' && (!department || !level)) return res.status(400).json({ message: 'Department and level required for students' });

  db.query('SELECT * FROM registrations WHERE email = ?', [email], (err, existing) => {
    if (err) return res.status(500).send('Database error');
    if (existing.length > 0) return res.status(409).json({ error: 'Email already exists' });

    const prefixMap = { student: 'UABS', staff: 'UABT', admin: 'UABA' };
    const prefix = prefixMap[role];

    db.query('SELECT roleSpecificField FROM registrations WHERE role = ? ORDER BY id DESC LIMIT 1', [role], (err2, result) => {
      if (err2) return res.status(500).send('Database error');

      let nextNumber = 1;
      if (result.length > 0) nextNumber = parseInt(result[0].roleSpecificField.replace(/\D/g, ''), 10) + 1;
      const newId = `${prefix}${String(nextNumber).padStart(4, '0')}`;

      db.query(
        'INSERT INTO registrations (role, fullName, email, department, level, roleSpecificField, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [role, fullName, email, department || null, level || null, newId, password],
        (err3) => {
          if (err3) return res.status(500).send('Database error');
          res.json({ message: 'Registration successful', generatedId: newId });
        }
      );
    });
  });
});

// Login
app.post('/login', (req, res) => {
  const { username, userType, password } = req.body;
  if (!username || !userType || !password) return res.status(400).json({ message: 'All fields required' });

  db.query(
    'SELECT id, role, fullName, roleSpecificField, department, level, password FROM registrations WHERE roleSpecificField = ? AND role = ?',
    [username, userType],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (result.length === 0) return res.status(401).json({ field: 'username', message: 'User ID or role is incorrect' });

      const user = result[0];
      if (password !== user.password) return res.status(401).json({ field: 'password', message: 'Incorrect password' });

      const token = jwt.sign({ id: user.id, role: user.role, userId: user.roleSpecificField, department: user.department, level: user.level }, JWT_SECRET, { expiresIn: '2h' });

      res.json({ message: 'Login successful', token, role: user.role, userId: user.roleSpecificField, fullName: user.fullName });
    }
  );
});

// Update user (admin)
app.put('/api/user/:userId', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const userId = req.params.userId;
  const { fullName, email, department, level } = req.body;

  db.query(
    'UPDATE registrations SET fullName = ?, email = ?, department = ?, level = ? WHERE roleSpecificField = ?',
    [fullName, email, department || null, level || null, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User updated successfully' });
    }
  );
});

// Reset password
app.post('/api/reset-password', (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) return res.status(400).json({ message: 'User ID and new password required' });

  db.query('UPDATE registrations SET password = ? WHERE roleSpecificField = ? OR email = ?', [newPassword, userId, userId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Password successfully updated' });
  });
});

// ===== Start Server =====
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
