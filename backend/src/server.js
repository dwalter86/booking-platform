import app from './app.js';
import { config } from './config.js';
import { query } from './lib/db.js';

async function bootstrap() {
  await query('SELECT 1');
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`booking-platform-api listening on port ${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('API bootstrap failed', error);
  process.exit(1);
});
