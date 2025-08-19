require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configuration CORS
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://frontend-nine-eta-99.vercel.app',
  'http://localhost:3000',
  'https://backend-beta-blond-93.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie']
}));

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress
});
app.use(limiter);

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : 'localhost'
  }
}));

// Connexion à MongoDB
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/google-sheets', require('./routes/googleSheets'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO Configuration
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Timeout Handling
app.use((req, res, next) => {
  req.setTimeout(10000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

module.exports = { app, server };