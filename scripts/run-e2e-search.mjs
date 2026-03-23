import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';

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

const run = (cmd, args) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 0));
  });

const main = async () => {
  const specPath = process.argv[2] ?? 'apps/web/e2e/search';
  const servers = spawn('node', ['scripts/e2e-servers.mjs'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_AI_ASSIST_ENABLED: 'true',
    },
  });
  let serversClosed = false;
  const cleanup = () => {
    if (!serversClosed && !servers.killed) {
      try {
        servers.kill('SIGTERM');
      } catch {
        /* noop */
      }
    }
    serversClosed = true;
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('exit', cleanup);

  // Wait for servers to be ready
  await waitForUrl('http://127.0.0.1:3002/health');
  await waitForUrl('http://127.0.0.1:3000/search');

  const code = await run('pnpm', [
    '--dir',
    'apps/web',
    'exec',
    'playwright',
    'test',
    '-c',
    'playwright.config.ts',
    specPath,
  ]);

  cleanup();

  if (code !== 0) {
    process.exit(code);
  }
};

main().catch((err) => {
  console.error('[e2e] failed', err);
  process.exit(1);
});
