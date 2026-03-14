module.exports = {
  apps: [
    {
      name: 'content-engine',
      script: 'dist/index.js',
      env: {
        PORT: 3012,
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '2G',
      autorestart: true,
      exp_backoff_restart_delay: 100,
      out_file: './logs/content-engine-out.log',
      error_file: './logs/content-engine-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
