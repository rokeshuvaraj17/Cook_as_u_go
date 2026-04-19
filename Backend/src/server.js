require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const kitchenRoutes = require('./routes/kitchen.routes');
const billsRoutes = require('./routes/bills.routes');
const scanRoutes = require('./routes/scan.routes');
const userApiSettingsRoutes = require('./routes/user-api-settings.routes');
const { initDb } = require('./db/initDb');
const { scanProxyHealthMeta } = require('./config/scanUpstream');

const app = express();
const PORT = parseInt(process.env.PORT || '5051', 10);

app.use(
  helmet({
    // Allow browsers (Expo web) on another origin to call this API.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'kitchen-api',
    time: new Date().toISOString(),
    ...scanProxyHealthMeta(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/user-api-settings', userApiSettingsRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) {
    return;
  }
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.name === 'MulterError')) {
    return res.status(413).json({ message: 'Upload too large.' });
  }
  res.status(500).json({ message: 'Internal server error' });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandledRejection', promise, reason);
});

/** Keep a strong ref so the HTTP server is never GC’d; also used for graceful shutdown. */
let httpServer;

async function start() {
  await initDb();
  httpServer = app.listen(PORT, '0.0.0.0');
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use (another server is running).`);
      console.error(`Free it: lsof -nP -iTCP:${PORT} -sTCP:LISTEN   then   kill <PID>`);
      console.error(`Or use a different port: PORT=5052 in .env`);
    } else {
      console.error('HTTP server error:', err);
    }
    process.exit(1);
  });
  httpServer.once('listening', () => {
    console.log(`API listening on http://0.0.0.0:${PORT} (LAN: use this machine's IP, same port)`);
  });
}

function shutdown(signal) {
  if (!httpServer) {
    process.exit(0);
    return;
  }
  httpServer.close(() => {
    console.log(`Received ${signal}, server closed`);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
