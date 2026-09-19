import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import tripsRoutes from './routes/trips.routes';
import dateOptionsRoutes from './routes/dateOptions.routes';
import votesRoutes from './routes/votes.routes';
import notesRoutes from './routes/notes.routes';
import preferencesRoutes from './routes/preferences.routes';
import resultsRoutes from './routes/results.routes';
import accommodationsRoutes from './routes/accommodations.routes';

export function createApp() {
  const app = express();

  // Hinter Nginx: echte Client-IP für Logs
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  // Datensparsamkeit: keine IP-Adressen, keine User-Agents, keine Query-Strings; Token in Pfaden
  // (Einladungen, Reset-Links) werden unkenntlich gemacht.
  morgan.token('safe-url', (req) => {
    const url = (req as { originalUrl?: string }).originalUrl ?? req.url ?? '';
    return url.split('?')[0].replace(/\/(invite|reset)\/[^/\s]+/g, '/$1/[entfernt]');
  });
  app.use(morgan(env.nodeEnv === 'production' ? ':method :safe-url :status :response-time ms' : 'dev'));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/trips', tripsRoutes);
  app.use('/api/trips/:tripId/date-options', dateOptionsRoutes);
  app.use('/api/trips/:tripId/votes', votesRoutes);
  app.use('/api/trips/:tripId/notes', notesRoutes);
  app.use('/api/trips/:tripId/preferences', preferencesRoutes);
  app.use('/api/trips/:tripId/results', resultsRoutes);
  app.use('/api/trips/:tripId/accommodations', accommodationsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
