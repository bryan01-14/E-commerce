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
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Configuration de sécurité
app.use(helmet());
// 1. Configuration CORS avancée
const corsOptions = {
  origin: [
    'https://frontend-nine-eta-99.vercel.app',
    'http://localhost:3000' // Pour le développement
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-real-ip'],
  credentials: true,
  optionsSuccessStatus: 200
};

// 2. Middleware CORS (doit être placé avant les routes)
app.use(cors(corsOptions));

// 3. Gestion explicite des requêtes OPTIONS (préflight)
app.options('*', cors(corsOptions)); // Toutes les routes
app.options('/api/*', cors(corsOptions)); // Spécifique aux API

// 1. Configuration cruciale pour Vercel (DOIT être placé en premier)
app.set('trust proxy', 1); // Faire confiance au premier proxy

// 2. Middleware de sécurité (peut rester)
app.use(helmet());

// 3. Configuration du rate limiting APRÈS trust proxy
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (req, res) => { // Ajoutez ce handler
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

// Configuration Socket.IO pour les notifications en temps réel
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

// Exporter io pour l'utiliser dans les routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Export unique et propre pour Vercel
const handler = serverless(app);
module.exports = handler; // Export principal pour Vercel
module.exports.io = io;   // Export additionnel si nécessaire
