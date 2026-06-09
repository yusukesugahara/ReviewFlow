const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { Client } = require('pg');

const DEMO_SEED_DEPLOY_LOCK_KEY = 'reviewflow:demo-seed-on-deploy';
const DEMO_SEED_DEPLOY_TABLE = 'demo_seed_deployments';

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

function envEnabled(name) {
  return process.env[name] === 'true' || process.env[name] === '1';
}

function resolveDeployKey() {
  return (
    process.env.DEMO_SEED_DEPLOY_KEY ||
    process.env.RENDER_GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.SOURCE_VERSION ||
    process.env.GIT_COMMIT_SHA ||
    ''
  ).trim();
}

function pgSslConfig() {
  if (process.env.DB_SSL !== 'true') {
    return undefined;
  }
  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

function pgClientConfig() {
  const ssl = pgSslConfig();
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ...(ssl !== undefined ? { ssl } : {}),
    };
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(ssl !== undefined ? { ssl } : {}),
  };
}

async function runDemoSeedOncePerDeploy(seedScriptPath) {
  const deployKey = resolveDeployKey();
  if (!deployKey) {
    console.warn(
      'SEED_DEMO_ON_DEPLOY is enabled, but no deploy key was found. ' +
        'Set DEMO_SEED_DEPLOY_KEY or use a platform that exposes a git commit SHA. ' +
        'Running demo seed for this start.',
    );
    runNode(seedScriptPath);
    return;
  }

  const client = new Client(pgClientConfig());
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [
      DEMO_SEED_DEPLOY_LOCK_KEY,
    ]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${DEMO_SEED_DEPLOY_TABLE} (
        deploy_key text PRIMARY KEY,
        seeded_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const existing = await client.query(
      `SELECT 1 FROM ${DEMO_SEED_DEPLOY_TABLE} WHERE deploy_key = $1 LIMIT 1`,
      [deployKey],
    );
    if (existing.rowCount > 0) {
      console.log(`Demo seed already ran for deploy ${deployKey}. Skipping.`);
      return;
    }

    console.log(`Running demo seed for deploy ${deployKey}...`);
    runNode(seedScriptPath);
    await client.query(
      `INSERT INTO ${DEMO_SEED_DEPLOY_TABLE} (deploy_key) VALUES ($1)`,
      [deployKey],
    );
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [
        DEMO_SEED_DEPLOY_LOCK_KEY,
      ]);
    } finally {
      await client.end();
    }
  }
}

async function main() {
  const seedScriptPath = resolveBackendPath('dist/scripts/seed-demo.js');

  if (envEnabled('SEED_DEMO_ON_DEPLOY')) {
    await runDemoSeedOncePerDeploy(seedScriptPath);
  } else if (envEnabled('SEED_DEMO_ON_START')) {
    console.log('SEED_DEMO_ON_START is enabled. Running demo seed...');
    runNode(seedScriptPath);
  }

  runNode(resolveBackendPath('dist/main.js'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
