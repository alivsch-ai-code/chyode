import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

const jwtSecret = required('JWT_SECRET', nodeEnv === 'production' ? undefined : 'dev-secret-change-me');
if (nodeEnv === 'production' && (jwtSecret.length < 32 || jwtSecret.startsWith('change-me'))) {
  throw new Error('JWT_SECRET must be a random string of at least 32 characters in production');
}

const smtpPort = parseInt(process.env.SMTP_PORT ?? '587', 10);

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv,
  frontendUrl,

  databaseUrl: required('DATABASE_URL'),

  jwtSecret,
  sessionTtlDays: parseInt(process.env.SESSION_TTL_DAYS ?? '7', 10),
  inviteTtlDays: parseInt(process.env.INVITE_TTL_DAYS ?? '7', 10),
  passwordResetTtlMin: parseInt(process.env.PASSWORD_RESET_TTL_MIN ?? '60', 10),
  cookieSecure: frontendUrl.startsWith('https://'),

  rapidApiKey: process.env.RAPIDAPI_KEY ?? '',
  bookingRapidApiHost: process.env.BOOKING_RAPIDAPI_HOST ?? 'booking-com.p.rapidapi.com',
  airbnbRapidApiHost: process.env.AIRBNB_RAPIDAPI_HOST ?? 'airbnb13.p.rapidapi.com',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',

  // IONOS-Standard: smtp.ionos.de, Port 587 (STARTTLS) oder 465 (SSL). Als Absender muss
  // die Adresse des authentifizierten Postfachs verwendet werden.
  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.ionos.de',
    port: smtpPort,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465,
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
  mailFrom: process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@localhost',
  appName: process.env.APP_NAME || 'Gruppen-Reiseplaner',
};

export const smtpConfigured = Boolean(env.smtp.user && env.smtp.pass);
