import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment file (idempotent — won't override values already set by playwright.config.ts)
const envFile = process.env.ENV ? `${process.env.ENV}.env` : '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Ensure ${envFile} exists and contains ${name}.`
    );
  }
  return value;
}

export const env = {
  CAVAGO_URL: requireEnv('CAVAGO_URL'),
  CAVAGO_USERNAME: requireEnv('CAVAGO_USERNAME'),
  CAVAGO_PASSWORD: requireEnv('CAVAGO_PASSWORD'),
};
