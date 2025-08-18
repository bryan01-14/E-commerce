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
const server = http.createServer(app);

// 1. Configuration cruciale pour Vercel
app.set('trust proxy', true);

// 2. Configuration Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000" || "https://frontend-nine-eta-99.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 1. Configuration CORS infaillible
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser toutes les origines en développement
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Liste des origines autorisées en production
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://frontend-nine-eta-99.vercel.app',
      'http://localhost:3000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

// 2. Middleware CORS
app.use(cors(corsOptions));

// 3. Gestion manuelle des requêtes OPTIONS
app.options('*', cors(corsOptions));

// 4. Configuration essentielle pour Vercel
app.set('trust proxy', true);

// 5. Middleware pour headers CORS supplémentaires
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Vary', 'Origin');
  next();
});

// Route de test CORS
app.get('/api/cors-test', (req, res) => {
  res.json({ status: 'CORS fonctionnel!', timestamp: Date.now() });
});

// 6. Configuration de sécurité
app.use(helmet());

// 7. Rate limiting adapté pour Vercel
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Trop de requêtes",
      message: "Veuillez réessayer plus tard"
    });
  }
});
app.use(limiter);

// 8. Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 9. Configuration des sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://e-commerce:e-commerce@e-commerce.ctxpjj8.mongodb.net/',
    ttl: 24 * 60 * 60 // 1 jour
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// 10. Connexion à MongoDB
connectDB();

// 11. Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/google-sheets', googleSheetsRoutes);

// 12. Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur opérationnel' });
});

// 13. Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'Accès interdit',
      message: 'Origine non autorisée'
    });
  }
  
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// 14. Configuration Socket.IO
io.on('connection', (socket) => {
  console.log('Nouveau client connecté:', socket.id);

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} a rejoint la room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client déconnecté:', socket.id);
  });
});

app.set('io', io);

// 15. Export pour Vercel
module.exports = serverless(app);
module.exports.io = io;