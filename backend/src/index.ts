import { createApp } from './app';
import { env } from './config/env';
import { startRetentionJob } from './services/retention.service';

const app = createApp();

app.listen(env.port, () => {
  console.log(`🚀 Tripplanner API läuft auf http://localhost:${env.port} (${env.nodeEnv})`);
  startRetentionJob();
});
