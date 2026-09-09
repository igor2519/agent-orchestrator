const path = require('path');

// Resolved from this file rather than the caller's cwd: PM2 is invoked from
// several directories and a relative path silently yields no app name.
require('dotenv').config({ path: path.join(__dirname, 'apps/frontend/.env') });

const appName = process.env.NEXT_PUBLIC_APP_NAME?.toLowerCase() ?? 'app';

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
