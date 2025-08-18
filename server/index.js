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
const server = http.createServer(app);

// Configuration de base
app.set('trust proxy', 1); // Important pour Vercel

// Configuration CORS simplifiée et efficace
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://frontend-nine-eta-99.vercel.app',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
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

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: Date.now() });
});

// Route de test CORS
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    status: 'CORS fonctionnel!', 
    timestamp: Date.now(),
    origin: req.headers.origin
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

// Configuration Socket.IO (uniquement en mode développement)
if (process.env.NODE_ENV !== 'production') {
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
}

// Remplacez la partie finale par :

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  // Mode développement local
  const server = app.listen(PORT, () => {
    console.log(`Serveur Express sur http://localhost:${PORT}`);
  });
  
  // Configuration Socket.IO seulement en local
  const io = require('socket.io')(server, {
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
} else {
  // Mode production Vercel
  module.exports = app;
}