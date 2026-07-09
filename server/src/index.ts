import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT } from './config.js';
import { healthRouter } from './routes/health.js';
import { networkRouter } from './routes/network.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use('/api', healthRouter);
app.use('/api', networkRouter);

// In production the frontend is built into web/dist and served by this same
// process, so the whole app is a single deployable service on one port.
const webDist = path.resolve(__dirname, '../../web/dist');
app.use(express.static(webDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(webDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`TfL 3D transport map server listening on http://localhost:${PORT}`);
});
