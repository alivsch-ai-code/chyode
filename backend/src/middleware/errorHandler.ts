import { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../utils/httpError';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Fehler des JSON-Body-Parsers
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Ungültiger JSON-Body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Die Anfrage ist zu groß' });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Interner Serverfehler' });
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route nicht gefunden: ${req.method} ${req.path}` });
};
