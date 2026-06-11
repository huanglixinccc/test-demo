module.exports = {
  apps: [
    {
      name: "recruit-agent",
      script: "dist/app.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      time: true,
    },
  ],
}
