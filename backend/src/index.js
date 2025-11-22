import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import FileStore from 'session-file-store';
import passport from './middleware/auth.js';
import authRoutes from './api/routes/authRoutes.js';
import userRoutes from './api/routes/userRoutes.js';
import playerRoutes from './api/routes/playerRoutes.js';
import categoryRoutes from './api/routes/categoryRoutes.js';
import tournamentRoutes from './api/routes/tournamentRoutes.js';
import registrationRoutes from './api/routes/registrationRoutes.js';
import rankingRoutes from './api/routes/rankingRoutes.js';
import tournamentRegistrationRoutes from './api/routes/tournamentRegistrationRoutes.js';
import pairRoutes from './api/routes/pairRoutes.js';
import {
  tournamentRulesRouter,
  matchRulesRouter,
  groupRulesRouter,
  bracketRulesRouter,
  roundRulesRouter,
  matchOverridesRouter
} from './api/routes/tournamentRulesRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Create FileStore constructor
const SessionFileStore = FileStore(session);

// Middleware setup
// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
// In development, allow multiple localhost ports (3001, 3002, 3003, etc.)
// In production, use specific FRONTEND_URL
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // In production, only allow specific frontend URL
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigin = process.env.FRONTEND_URL;
      if (origin === allowedOrigin) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }

    // In development, allow any localhost port
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Health check endpoint (before session middleware to avoid blocking)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Session configuration
app.use(session({
  store: new SessionFileStore({
    path: './sessions',
    ttl: 1800, // 30 minutes
    retries: 0
  }),
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 1800000, // 30 minutes
    sameSite: 'strict'
  }
}));

// Initialize Passport and session support
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/tournaments', tournamentRoutes);
app.use('/api/v1/registrations', registrationRoutes);
app.use('/api/v1/rankings', rankingRoutes);
app.use('/api/v1/pairs', pairRoutes);
app.use('/api/tournaments', tournamentRegistrationRoutes);
// Tournament rules routes with specific base paths
app.use('/api/v1/tournament-rules', tournamentRulesRouter);
app.use('/api/v1/match-rules', matchRulesRouter);
// Rule override routes for different entity levels
app.use('/api/v1/groups', groupRulesRouter);
app.use('/api/v1/brackets', bracketRulesRouter);
app.use('/api/v1/rounds', roundRulesRouter);
app.use('/api/v1/matches', matchOverridesRouter);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`BATL backend server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
