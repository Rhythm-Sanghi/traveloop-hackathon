import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const backend = resolve(import.meta.dirname, '..', '..', 'backend');
const database = resolve(backend, 'traveloop-e2e.sqlite3');
if (existsSync(database)) rmSync(database);

const python = process.platform === 'win32' ? 'python' : 'python3';
const env = {
  ...process.env,
  DATABASE_URL: `sqlite:///${database.replaceAll('\\', '/')}`,
  SECRET_KEY: 'e2e-only-secret-key-012345678901234567890123',
  APP_ENV: 'test',
  CORS_ORIGINS: 'http://127.0.0.1:5174',
};
const migration = spawnSync(python, ['-m', 'alembic', 'upgrade', 'head'], {
  cwd: backend,
  env,
  stdio: 'inherit',
});
if (migration.status !== 0) process.exit(migration.status || 1);

const server = spawn(python, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8001'], {
  cwd: backend,
  env,
  stdio: 'inherit',
});
const cleanup = () => {
  if (!server.killed) server.kill();
  if (existsSync(database)) rmSync(database);
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
