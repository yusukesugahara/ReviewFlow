#!/usr/bin/env node

const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const FRONTEND_ROOT = join(__dirname, "..");
const API_KEY_MIN_LENGTH = 16;

function parseEnvFile(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match) {
      continue;
    }

    const [, key, rawValue = ""] = match;
    let value = rawValue.trim();
    const quote = value[0];
    if (
      (quote === "\"" || quote === "'") &&
      value.length >= 2 &&
      value[value.length - 1] === quote
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    env[key] = value;
  }
  return env;
}

function loadEnvFiles(root = FRONTEND_ROOT, baseEnv = process.env) {
  const fileEnv = {};
  for (const filename of [
    ".env",
    ".env.production",
    ".env.local",
    ".env.production.local",
  ]) {
    const path = join(root, filename);
    if (existsSync(path)) {
      Object.assign(fileEnv, parseEnvFile(readFileSync(path, "utf8")));
    }
  }
  return { ...fileEnv, ...baseEnv };
}

function readRequired(env, key) {
  const value = env[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateFrontendBuildEnv(env) {
  const errors = [];
  const publicApiUrl = readRequired(env, "NEXT_PUBLIC_API_URL");
  const internalApiKey = readRequired(env, "INTERNAL_API_KEY");
  const internalApiOrigin = readRequired(env, "INTERNAL_API_ORIGIN");

  if (!publicApiUrl) {
    errors.push("NEXT_PUBLIC_API_URL を設定してください。");
  } else if (!isHttpUrl(publicApiUrl)) {
    errors.push("NEXT_PUBLIC_API_URL は http(s) の URL で設定してください。");
  }

  if (!internalApiKey) {
    errors.push("INTERNAL_API_KEY を設定してください。");
  } else if (internalApiKey.length < API_KEY_MIN_LENGTH) {
    errors.push(
      `INTERNAL_API_KEY は ${API_KEY_MIN_LENGTH} 文字以上で設定してください。`,
    );
  }

  if (internalApiOrigin && !isHttpUrl(internalApiOrigin)) {
    errors.push("INTERNAL_API_ORIGIN は http(s) の URL で設定してください。");
  }

  return errors;
}

function assertFrontendBuildEnv(env = loadEnvFiles()) {
  const errors = validateFrontendBuildEnv(env);
  if (errors.length > 0) {
    const messageLines = [
      "frontend のビルドに必要な環境変数が不足しています。",
      ...errors.map((error) => `- ${error}`),
    ];
    throw new Error(
      messageLines.join("\n"),
    );
  }
}

if (require.main === module) {
  try {
    assertFrontendBuildEnv();
    console.log("frontend の環境変数を確認しました。");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

module.exports = {
  assertFrontendBuildEnv,
  loadEnvFiles,
  parseEnvFile,
  validateFrontendBuildEnv,
};
