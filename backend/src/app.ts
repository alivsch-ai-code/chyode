import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import tripsRoutes from './routes/trips.routes';
import dateOptionsRoutes from './routes/dateOptions.routes';
import votesRoutes from './routes/votes.routes';
import notesRoutes from './routes/notes.routes';
import resultsRoutes from './routes/results.routes';
import accommodationsRoutes from './routes/accommodations.routes';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.frontendUrl }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/trips', tripsRoutes);
  app.use('/api/trips/:tripId/date-options', dateOptionsRoutes);
  app.use('/api/trips/:tripId/votes', votesRoutes);
  app.use('/api/trips/:tripId/notes', notesRoutes);
  app.use('/api/trips/:tripId/results', resultsRoutes);
  app.use('/api/trips/:tripId/accommodations', accommodationsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
