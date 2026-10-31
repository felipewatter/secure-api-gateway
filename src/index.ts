import { parseConfig } from './config';
import { makeGateway } from './server';
try {
  const config = parseConfig(process.env);
  const server = makeGateway(config);
  server.listen(config.port, () => console.log(JSON.stringify({ event: 'gateway_started', port: config.port })));
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
} catch (error) {
  console.error(JSON.stringify({ event: 'startup_failed', reason: error instanceof Error ? error.message : 'unknown' }));
  process.exitCode = 1;
}
