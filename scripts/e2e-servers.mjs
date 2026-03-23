import { spawn, spawnSync } from 'child_process';
import { setTimeout as wait } from 'timers/promises';

const procs = [];

const cleanup = () => {
  for (const p of procs) {
    if (p && !p.killed) {
      try {
        p.kill('SIGTERM');
      } catch {
        /* noop */
      }
    }
  }
};

const handleExit = (code = 0) => {
  cleanup();
  process.exit(code);
};

process.on('SIGINT', () => handleExit(130));
process.on('SIGTERM', () => handleExit(0));
process.on('exit', cleanup);

const waitForUrl = async (url, retries = 60, intervalMs = 500) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* ignore */
    }
    await wait(intervalMs);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const start = (cmd, args, options = {}) => {
  const child = spawn(cmd, args, { stdio: 'inherit', ...options });
  procs.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[servers] child exited with code ${code}`);
    }
  });
};

const killPort = async (port) => {
  spawnSync('bash', ['-lc', `lsof -ti:${port} | xargs -r kill -TERM`], {
    stdio: 'inherit',
  });
  await wait(1000);
  spawnSync('bash', ['-lc', `lsof -ti:${port} | xargs -r kill -KILL`], {
    stdio: 'inherit',
  });
};

const main = async () => {
  console.log('[servers] killing ports 3000/3002');
  await Promise.all([killPort(3000), killPort(3002)]);

  console.log('[servers] starting api/web');
  start('pnpm', ['--dir', 'apps/api', 'dev'], {
    env: {
      ...process.env,
      DATA_PROVIDER: 'mock',
      DEV_FALLBACK_TO_MOCK: 'true',
      NODE_ENV: 'test',
    },
  });
  start('pnpm', ['--dir', 'apps/web', 'dev'], {
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: '',
      NEXT_PUBLIC_API_URL: '',
    },
  });

  await waitForUrl('http://127.0.0.1:3002/health');
  await waitForUrl('http://127.0.0.1:3000/search');

  console.log('[servers] READY');
  // Keep alive until killed
  process.stdin.resume();
};

main().catch((err) => {
  console.error('[servers] failed to start', err);
  handleExit(1);
});
