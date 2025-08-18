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

// 1. Configuration cruciale pour Vercel (DOIT être placé en premier)
app.set('trust proxy', true); // Modification importante pour Vercel

// Configuration Socket.IO après trust proxy
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Configuration de sécurité
app.use(helmet());

// Configuration CORS avancée
const corsOptions = {
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'https://frontend-nine-eta-99.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-real-ip'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Configuration du rate limiting adapté pour Vercel
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    // Utilisation de x-real-ip ou x-forwarded-for pour Vercel
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

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuration des sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://e-commerce:e-commerce@e-commerce.ctxpjj8.mongodb.net/'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none', // Important pour CORS avec credentials
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
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
  res.json({ status: 'OK', message: 'Serveur opérationnel' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Configuration Socket.IO
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

// Export pour Vercel
module.exports = serverless(app);
module.exports.io = io;