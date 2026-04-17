module.exports = {
  apps: [
    {
      name: "crm-bot",
      script: "npx",
      args: "tsx index.ts",
      cwd: __dirname,
      restart_delay: 5000,
      max_restarts: 10,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
