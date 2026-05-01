#!/usr/bin/env node
/**
 * Runs src/server.js under a supervisor: restarts after non-zero exits or crashes,
 * with exponential backoff (capped). Clean exit (code 0) or SIGINT/SIGTERM stops the supervisor.
 */
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const serverJs = path.join(root, 'src', 'server.js');
const node = process.execPath;

let child = null;
let restartAttempt = 0;
let lastSpawnAt = 0;
let shuttingDown = false;

function backoffMs() {
  const base = 1000;
  const cap = 15_000;
  return Math.min(cap, base * 2 ** Math.min(restartAttempt, 4));
}

function spawnServer() {
  if (shuttingDown) {
    return;
  }
  lastSpawnAt = Date.now();
  child = spawn(node, [serverJs], {
    stdio: 'inherit',
    env: process.env,
    cwd: root,
  });

  child.on('exit', (code, signal) => {
    child = null;
    if (shuttingDown) {
      process.exit(code ?? 0);
      return;
    }

    const uptimeMs = Date.now() - lastSpawnAt;
    if (uptimeMs > 60_000) {
      restartAttempt = 0;
    }

    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      process.exit(code ?? 0);
      return;
    }
    if (code === 0 || code === null) {
      process.exit(0);
      return;
    }

    restartAttempt += 1;
    const wait = backoffMs();
    console.error(
      `[kitchen-api supervisor] Server exited (code=${code}, signal=${signal}). Restarting in ${wait}ms…`
    );
    setTimeout(spawnServer, wait);
  });
}

function forwardShutdown(signal) {
  shuttingDown = true;
  if (child && !child.killed) {
    child.kill(signal);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => forwardShutdown('SIGINT'));
process.on('SIGTERM', () => forwardShutdown('SIGTERM'));

spawnServer();
