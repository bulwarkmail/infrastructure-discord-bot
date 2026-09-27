module.exports = {
  apps: [
    {
      name: 'github-discord-bot',
      script: 'src/index.js',
      cwd: __dirname,
      max_restarts: 10,
      env: { NODE_ENV: 'production' },
    },
  ],
};
