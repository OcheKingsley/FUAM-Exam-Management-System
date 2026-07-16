const express = require('express'); 
require('dotenv').config();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;
const app = express();

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false })); // Serve static files


// ===== MySQL Connection =====
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    ca: fs.readFileSync('./ca.pem')
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Connection failed:', err);
    return;
  }

  console.log('✅ Connected to Aiven MySQL');
  connection.release();
});


// ===== Utility Functions =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: "No token provided"
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {

    if (err) {
      return res.status(403).json({
        message: "Invalid or expired token"
      });
    }

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

app.get('/submitQuestion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'question.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reg.html'));
});

app.get('/update-user', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'update-user.html'));
});

app.get('/admin-results', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'admin-view-results.html'));
});

app.get('/view-user', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'view-user.html'));
});

app.get('/view-exam', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'view-assign-exam.html'));
});

app.get('/view-questions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'view-question.html'));
});

app.get('/view-student', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'view-student-ans.html'));
});
app.get(
  ['/dashboard', '/dashboard/', '/student-dashboard', '/student-results', '/forgot-password'],
  (req, res) => {
    console.log('Requested path:', req.path);
    const mapping = {
      '/dashboard': 'dashboard/dashboard.html',
      '/dashboard/': 'dashboard/dashboard.html',

      '/student-dashboard': 'dashboard/student-dashboard.html',

      '/student-results': 'student-result.html',

      '/forgot-password': 'forgot-password.html'
    };

    res.sendFile(
      path.join(__dirname, 'public', mapping[req.path])
    );
});

// Admin - View all student results
app.get(
  '/api/admin/results',
  authenticateToken,
  authorizeRoles('admin'),
  (req, res) => {

    db.query(
      `SELECT
          student_id,
          courseCode,
          courseTitle,
          score,
          total_questions,
          percentage,
          weighted_score
       FROM exam_results
       ORDER BY submitted_at DESC`,
      (err, results) => {

        if (err) {
          console.error(err);
          return res.status(500).json({
            message: "Database error"
          });
        }

        res.json(results);
      }
    );

  }
);

// Admin - Search student results
app.get(
  '/api/admin/results/search',
  authenticateToken,
  authorizeRoles('admin'),
  (req, res) => {

    const studentId = req.query.studentId;

    db.query(
      `SELECT
          student_id,
          courseCode,
          courseTitle,
          score,
          total_questions,
          percentage,
          weighted_score
       FROM exam_results
       WHERE student_id = ?`,
      [studentId],
      (err, results) => {

        if (err) {
          console.error(err);
          return res.status(500).json({
            message: "Database error"
          });
        }

        res.json(results);
      }
    );

  }
);

// Student - View only own results
app.get(
  '/api/student/results',
  authenticateToken,
  authorizeRoles('student'),
  (req, res) => {

    db.query(
      `SELECT
          courseCode,
          courseTitle,
          score,
          total_questions,
          percentage,
          weighted_score,
          submitted_at
       FROM exam_results
       WHERE student_id = ?`,
      [req.user.userId],
      (err, results) => {

        if (err) {
          console.error(err);
          return res.status(500).json({
            message: "Database error"
          });
        }

        res.json(results);
      }
    );

  }
);

// admin exam view 
app.get(
    '/api/exam-courseTitle',
    authenticateToken,
    (req, res) => {

        db.query(
            `
            SELECT
                id,
                courseTitle,
                courseCode
            FROM exam
           ORDER BY examTime ASC
            `,
            (err, results) => {

                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                res.json(results);

            }
        );

    }
);

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

// Get questions for a particular exam (Eligible students only)
app.get(
  "/api/quiz/:examId",
  authenticateToken,
  authorizeRoles("student"),
  (req, res) => {

    const examId = req.params.examId;

    db.query(
      `
      SELECT
          q.id,
          q.question,
          q.optionA,
          q.optionB,
          q.optionC,
          q.optionD,
          e.examTime,
          e.endTime
      FROM questions q
      JOIN exam e
      ON q.exam_id = e.id
      WHERE q.exam_id = ?
      AND e.eligibleDepartment = ?
      AND e.eligibleLevel = ?
      `,
      [
        examId,
        req.user.department,
        req.user.level
      ],
      (err, results) => {

        if (err) {
          console.error(err);
          return res.status(500).json({
            message: "Database error"
          });
        }

        if (results.length === 0) {
          return res.status(403).json({
            message: "You are not eligible to take this exam or no questions were found."
          });
        }

        // Check exam time
        const now = new Date();
        const examTime = new Date(results[0].examTime);
        const endTime = new Date(results[0].endTime);

        if (now < examTime) {
          return res.status(403).json({
            message: "Exam has not started."
          });
        }

        if (now > endTime) {
          return res.status(403).json({
            message: "Exam has ended."
          });
        }

        // Remove examTime and endTime before sending questions
        const questions = results.map(question => ({
          id: question.id,
          question: question.question,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD
        }));

        res.json(questions);

      }
    );

  }
);

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

// post for assigning exam 
app.post("/assignExam", authenticateToken, (req, res) => {

    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Access denied"
        });
    }

    const {
        courseTitle,
        courseCode,
        eligibleDepartment,
        eligibleLevel,
        unitAllocated,
        allocatedTime,
        examTime,
        endTime
    } = req.body;

    if (
        !courseTitle ||
        !courseCode ||
        !eligibleDepartment ||
        !eligibleLevel ||
        !unitAllocated ||
        !allocatedTime ||
        !examTime ||
        !endTime
    ) {
        return res.status(400).json({
            message: "All fields are required."
        });
    }

    const sql = `
        INSERT INTO exam
        (
            courseTitle,
            courseCode,
            eligibleDepartment,
            eligibleLevel,
            unitAllocated,
            allocatedTime,
            examTime,
            endTime
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            courseTitle,
            courseCode,
            eligibleDepartment,
            eligibleLevel,
            unitAllocated,
            allocatedTime,
            examTime,
            endTime
        ],
        (err, result) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Database error"
                });
            }

            res.json({
                success: true,
                message: "Exam assigned successfully.",
                examId: result.insertId
            });

        }
    );

});

// for submiting question 
app.post("/submitQuestion", authenticateToken, (req, res) => {

    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Access denied"
        });
    }

    const questions = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
            message: "No questions received."
        });
    }

    // Validate every question
    for (const q of questions) {
        if (
            !q.examId ||
            !q.question ||
            !q.optionA ||
            !q.optionB ||
            !q.optionC ||
            !q.optionD ||
            !q.correctAnswer
        ) {
            return res.status(400).json({
                message: "Incomplete question detected."
            });
        }
    }



    const values = questions.map(q => [

        q.examId,
        q.question,
        q.optionA,
        q.optionB,
        q.optionC,
        q.optionD,
        q.correctAnswer

    ]);

    const sql = `
        INSERT INTO questions
        (
            exam_id,
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer
        )
        VALUES ?
    `;

    db.query(sql, [values], (err, result) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json({
            success: true,
            message: `${result.affectedRows} question(s) submitted successfully.`
        });

    });

});


app.post(
  "/api/submit-exam",
  authenticateToken,
  authorizeRoles("student"),
  (req, res) => {

    const {
      examId,
      score,
      total_questions,
      percentage,
      weighted_score
    } = req.body;

    // Validate required fields
    if (
      !examId ||
      score === undefined ||
      total_questions === undefined ||
      percentage === undefined ||
      weighted_score === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required."
      });
    }

    // Validate score
    if (score > total_questions || score < 0) {
      return res.status(400).json({
        message: "Invalid score."
      });
    }

    // Check if exam exists
    db.query(
      `
      SELECT
          courseCode,
          courseTitle
      FROM exam
      WHERE id = ?
      `,
      [examId],
      (err, exam) => {

        if (err) {
          console.error(err);
          return res.status(500).json({
            message: "Database error"
          });
        }

        if (exam.length === 0) {
          return res.status(404).json({
            message: "Exam not found"
          });
        }

        // Check whether student has already submitted this exam
        db.query(
          `
          SELECT id
          FROM exam_results
          WHERE student_id = ?
          AND exam_id = ?
          `,
          [req.user.userId, examId],
          (err, existing) => {

            if (err) {
              console.error(err);
              return res.status(500).json({
                message: "Database error"
              });
            }

            if (existing.length > 0) {
              return res.status(400).json({
                message: "You have already submitted this exam."
              });
            }

            // Save exam result
            db.query(
              `
              INSERT INTO exam_results
              (
                  student_id,
                  exam_id,
                  courseCode,
                  courseTitle,
                  score,
                  total_questions,
                  percentage,
                  weighted_score
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                req.user.userId,
                examId,
                exam[0].courseCode,
                exam[0].courseTitle,
                score,
                total_questions,
                percentage,
                weighted_score
              ],
              (err2) => {

                if (err2) {
                  console.error(err2);
                  return res.status(500).json({
                    message: "Failed to save result"
                  });
                }

                res.json({
                  success: true,
                  message: "Exam submitted successfully."
                });

              }
            );

          }
        );

      }
    );

  }
);

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

// Get logged-in user profile
app.get('/api/me', authenticateToken, (req, res) => {

  console.log("===== /api/me called =====");
  console.log("User from token:", req.user);

  db.query(
    `SELECT 
        id,
        fullName,
        email,
        role,
        roleSpecificField,
        department,
        level,
        created_at
     FROM registrations
     WHERE id = ?`,
    [req.user.id],

    (err, result) => {

      if (err) {
        console.error("Database error:", err);

        return res.status(500).json({
          message: "Database error",
          error: err.message
        });
      }


      console.log("Database result:", result);


      if (result.length === 0) {

        console.log("No user found with ID:", req.user.id);

        return res.status(404).json({
          message: "User not found"
        });
      }


      console.log("Sending user data:", result[0]);

      res.json(result[0]);

    }
  );

});

// Get available exams for students
app.get('/api/student/exams', authenticateToken, authorizeRoles('student'), (req, res) => {

  const department = req.user.department;
  const level = req.user.level;

  db.query(
  `
  SELECT
    id,
    courseTitle,
    courseCode
  FROM exam
  WHERE eligibleDepartment = ?
  AND eligibleLevel = ?
  ORDER BY examTime ASC
  `,
  [department, level],
  (err, result) => {
    if (err) {
      console.error("Exam loading error:", err);

      return res.status(500).json({
        message: "Database error",
        error: err.message
      });
    }

    res.json(result);
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

// Delete exam and all its questions
app.delete(
  "/api/exam/:id",
  authenticateToken,
  authorizeRoles("admin"),
  (req, res) => {

    const examId = req.params.id;

    db.query(
      "DELETE FROM questions WHERE exam_id = ?",
      [examId],
      (err) => {

        if (err) {
          console.error(err);
          return res.status(500).json({
            message: "Failed to delete questions"
          });
        }

        db.query(
          "DELETE FROM exam WHERE id = ?",
          [examId],
          (err2, result) => {

            if (err2) {
              console.error(err2);
              return res.status(500).json({
                message: "Failed to delete exam"
              });
            }

            if (result.affectedRows === 0) {
              return res.status(404).json({
                message: "Exam not found"
              });
            }

            res.json({
              success: true,
              message: "Exam deleted successfully"
            });

          }
        );

      }
    );

  }
);

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message: "Internal Server Error"
  });
});


// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});