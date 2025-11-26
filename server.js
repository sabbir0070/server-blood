const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 Direct Mongo URI
const MONGO_URI = "mongodb+srv://bloodServer:kJQIoEQB38a2951S@cluster0.xjpgufh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

connectDB(MONGO_URI);

const allowedOrigins = [
  "http://localhost:5173",             // Vite default port
  "http://localhost:1723",             // Alternative port
  "http://localhost:3000",             // React default port
  "http://localhost:10499",           // Vite alternative port
  "http://localhost:13453",           // Vite alternative port
  "https://bloodnishiralo.netlify.app", // Netlify URL
  "https://server-blood.vercel.app"    // Vercel server (for production)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow localhost on any port
        if (origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
        // Also allow localhost in production for testing
        if (origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
        console.warn('CORS blocked origin:', origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/donors', require('./routes/donors'));
app.use('/api/success-stories', require('./routes/successStories'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/blood-requests', require('./routes/bloodRequests'));
app.use('/api/alerts', require('./routes/alerts'));

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/', (req, res) => res.json({ message: "API is running" }));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Global Error:', err);

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file upload.'
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
