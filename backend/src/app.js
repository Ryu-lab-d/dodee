const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const lineController = require('./controllers/line.controller');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Wide open in dev; locked to the real frontend origin once deployed (set FRONTEND_URL).
app.use(cors(process.env.NODE_ENV === 'production' ? { origin: process.env.FRONTEND_URL } : {}));
app.use(morgan('dev'));

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
