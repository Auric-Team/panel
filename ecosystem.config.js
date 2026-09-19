module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/root/panel/backend',
      script: '/root/.bun/bin/bun',
      args: 'src/index.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 20067,
      },
      restart_delay: 2000,
      autorestart: true,
      max_restarts: 50,
    },
    {
      name: 'frontend',
      cwd: '/root/panel/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 0.0.0.0',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BACKEND_INTERNAL_URL: 'http://127.0.0.1:20067',
        NEXT_PUBLIC_API_URL: 'https://api.axioshacks.com',
      },
      restart_delay: 2000,
      autorestart: true,
      max_restarts: 50,
    },
  ],
};
