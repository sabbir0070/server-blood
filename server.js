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
  "http://localhost:5173",             // লোকালি চলবে
  "https://bloodnishiralo.netlify.app" // Netlify URL
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
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

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/', (req, res) => res.json({ message: "API is running" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
