const express = require('express');
const connectDB = require('./config/database');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const googleSheetsRoutes = require('./routes/googleSheets');

const app = express();

// Configuration de base
app.set('trust proxy', 1);

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

// Middleware de sécurité
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  }
});
app.use(limiter);

// Dans votre configuration de session (backend)
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

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/google-sheets', googleSheetsRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenue sur le serveur API',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs',
      api: '/api'
    }
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Middleware anti-timeout
app.use((req, res, next) => {
  req.setTimeout(5000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Timeout' });
    }
  });
  next();
});

// Mode développement local
// Dans votre backend
if (process.env.VERCEL) {
  // Configuration pour Vercel
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  
  module.exports = { app, server };
} else {
  // Configuration pour développement local
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Serveur sur http://localhost:${PORT}`);
  });
  
  const io = socketIo(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true
    }
  });
}

module.exports = app;