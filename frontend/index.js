const { spawn } = require('child_process');

console.log('====================================================');
console.log('  AXIOS MOD MENU FRONTEND AUTOMATIC BUILD & LAUNCH');
console.log('====================================================');

const bunCmd = process.platform === 'win32' ? 'bun.exe' : 'bun';

console.log('[Frontend Launcher] Launching Next.js development server on http://localhost:3000...');

const devProcess = spawn(bunCmd, ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

devProcess.on('close', (code) => {
  console.log(`[Frontend Launcher] Server closed with code ${code}`);
});
