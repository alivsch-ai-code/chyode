import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  magicLinkTtlMin: parseInt(process.env.MAGIC_LINK_TOKEN_TTL_MIN ?? '30', 10),
  creatorSessionTtlDays: parseInt(process.env.CREATOR_SESSION_TTL_DAYS ?? '30', 10),

  rapidApiKey: process.env.RAPIDAPI_KEY ?? '',
  bookingRapidApiHost: process.env.BOOKING_RAPIDAPI_HOST ?? 'booking-com.p.rapidapi.com',
  airbnbRapidApiHost: process.env.AIRBNB_RAPIDAPI_HOST ?? 'airbnb13.p.rapidapi.com',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',

  mailFrom: process.env.MAIL_FROM ?? 'noreply@tripplanner.app',
};
