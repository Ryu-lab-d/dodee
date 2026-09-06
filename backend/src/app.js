const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const lineController = require('./controllers/line.controller');
const errorHandler = require('./middleware/error.middleware');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Wide open in dev; locked to the real frontend origin once deployed (set FRONTEND_URL).
app.use(cors(process.env.NODE_ENV === 'production' ? { origin: process.env.FRONTEND_URL } : {}));
app.use(morgan('dev'));

// Brute-force protection on login: 20 attempts per IP per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง' },
});
app.use('/api/auth/login', loginLimiter);

// General API rate limit as a baseline DoS/abuse guard.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// LINE webhook needs the raw body to verify x-line-signature, so it must be
// registered before the global express.json() parser below.
app.post('/api/line/webhook', express.raw({ type: '*/*' }), lineController.webhook);

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use(errorHandler);

module.exports = app;
