import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { initializeDatabase, setupGracefulShutdown } from './config/database.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login attempts per windowMs
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// API routes
app.use('/api', routes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function start() {
  try {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║      Realm of Dungeons - Admin Panel Server               ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(43)}║`);
    console.log(`║  Port: ${PORT.toString().padEnd(50)}║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Setup graceful shutdown
    setupGracefulShutdown();

    // Initialize database connection
    await initializeDatabase();
    console.log('');

    // Start listening
    app.listen(PORT, () => {
      console.log(`[Server] Admin panel API running on http://localhost:${PORT}`);
      console.log(`[Server] Frontend expected at ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log('');
      console.log('[Server] Ready to accept connections!');
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

start();
