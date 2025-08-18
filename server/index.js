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
const serverless = require('serverless-http');

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
  'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware de sécurité
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting corrigé
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 
           req.headers['x-real-ip'] || 
           req.headers['x-forwarded-for'] || 
           req.socket.remoteAddress;
  }
});
app.use(limiter);

// Configuration des sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
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
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Connexion à MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/google-sheets', googleSheetsRoutes);

// Routes de test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/cors-test', (req, res) => {
  res.json({ 
    status: 'CORS fonctionnel!',
    origin: req.headers.origin,
    allowedOrigins
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'Accès interdit',
      message: 'Origine non autorisée',
      allowedOrigins
    });
  }
  
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Configuration pour Vercel vs développement local
if (process.env.VERCEL) {
  // Mode production Vercel (Serverless)
  module.exports = serverless(app);
} else {
  // Mode développement local
  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);
  
  // Configuration Socket.IO seulement en local
  const io = socketIo(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Nouveau client connecté:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client déconnecté:', socket.id);
    });
  });

  app.set('io', io);

  server.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
    console.log(`Origines CORS autorisées: ${allowedOrigins.join(', ')}`);
  });
}