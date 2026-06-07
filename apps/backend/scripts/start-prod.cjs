const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

function resolveBackendPath(relativePath) {
  const fromPackageCwd = join(process.cwd(), relativePath);
  if (existsSync(fromPackageCwd)) {
    return fromPackageCwd;
  }
  return join(process.cwd(), 'apps/backend', relativePath);
}

function runNode(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (
  process.env.SEED_DEMO_ON_START === 'true' ||
  process.env.SEED_DEMO_ON_START === '1'
) {
  console.log('SEED_DEMO_ON_START is enabled. Running demo seed...');
  runNode(resolveBackendPath('dist/scripts/seed-demo.js'));
}

runNode(resolveBackendPath('dist/main.js'));
