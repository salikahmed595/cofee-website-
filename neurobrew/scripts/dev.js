// Runs the API (with auto-reload) and the Vite dev server together. Ctrl+C stops both.
import { spawn } from 'node:child_process';

const run = (cmd, args, name) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  p.on('exit', (code) => { console.log(`[${name}] exited (${code})`); shutdown(code ?? 0); });
  return p;
};
const procs = [
  run('node', ['--watch', 'server/index.js'], 'api'),
  run('npx', ['vite', '--port', '5174', '--strictPort'], 'web'),
];
let down = false;
function shutdown(code) { if (down) return; down = true; procs.forEach((p) => { try { p.kill(); } catch { /* already gone */ } }); process.exit(code); }
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
