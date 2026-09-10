const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * Reads an env file without touching this process's environment.
 *
 * `dotenv.config()` would assign every key into `process.env` of the PM2 CLI,
 * and PM2 passes its own environment down to every child it spawns. The
 * frontend's `PORT=3000` therefore reached the API as well - where its own
 * `.env` could not correct it, because dotenv never overwrites a variable that
 * is already set. Both apps then bound the same port.
 *
 * `dotenv.parse()` just returns an object, so nothing escapes this file.
 * Resolved from `__dirname` because PM2 is invoked from several directories.
 */
const readEnvFile = (relativePath) => {
  try {
    return dotenv.parse(fs.readFileSync(path.join(__dirname, relativePath)));
  } catch {
    // The app name is cosmetic; a missing file must not break the deploy.
    return {};
  }
};

const appName = readEnvFile('apps/frontend/.env').NEXT_PUBLIC_APP_NAME?.toLowerCase() ?? 'app';

if (!process.env.NVM_DIR) {
  throw new Error('NVM_DIR env variable not found!');
}
if (!process.version) {
  throw new Error('Running unknown node version!');
}
const interpreterPath = `${process.env.NVM_DIR}/versions/node/${process.version}/bin/node`;

/**
 * PORT is deliberately not set here.
 *
 * Every app reads its own apps/<name>/.env through ConfigModule, which resolves
 * relative to the process cwd set below. A PORT here would take precedence over
 * that file and silently disagree with NEXT_PUBLIC_BACKEND_URL.
 */
const service = (name, cwd, { cluster = false } = {}) => ({
  name: `${appName} ${name}`,
  cwd,
  script: 'dist/main.js',
  interpreter: interpreterPath,
  instances: 1,
  // The workers consume from RabbitMQ and serve no HTTP; cluster mode buys
  // nothing there and only complicates shutdown.
  exec_mode: cluster ? 'cluster' : 'fork',
  env: { NODE_ENV: 'development' },
  env_production: { NODE_ENV: 'production' },
});

module.exports = {
  apps: [
    service('backend', './apps/api', { cluster: true }),
    {
      ...service('frontend', './apps/frontend/.next/standalone/apps/frontend', { cluster: true }),
      // Next's standalone output emits its own server entrypoint.
      script: 'server.js',
    },
    // Without these three the API accepts documents and nothing ever processes
    // them: they are the OCR, processing and notification consumers.
    service('ocr', './apps/ocr-service'),
    service('processing', './apps/processing-service'),
    service('notification', './apps/notification-service'),
  ],
};
