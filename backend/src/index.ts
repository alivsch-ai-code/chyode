import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.port, () => {
  console.log(`🚀 Tripplanner API läuft auf http://localhost:${env.port} (${env.nodeEnv})`);
});
