import { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../utils/httpError';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Interner Serverfehler' });
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route nicht gefunden: ${req.method} ${req.path}` });
};
