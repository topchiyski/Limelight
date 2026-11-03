import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
export const STORAGE_STATE = path.join(PROJECT_ROOT, '.auth', 'user.json');

const TEST_ENVS = ['local', 'dev', 'staging', 'prod'] as const;
export type TestEnv = (typeof TEST_ENVS)[number];

const testEnv = z.enum(TEST_ENVS).default('local').parse(process.env['TEST_ENV'] || undefined);

// Earlier files win; real process env always wins over both.
dotenv.config({
  path: [path.join(PROJECT_ROOT, `.env.${testEnv}`), path.join(PROJECT_ROOT, '.env')],
  quiet: true,
});

const withTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

const EnvSchema = z
  .object({
    TEST_ENV: z.enum(TEST_ENVS),
    BASE_URL: z.url(),
    API_URL: z.url().optional(),
    USER_EMAIL: z.email(),
    USER_PASSWORD: z.string().min(1),
    API_TOKEN: z.string().min(1).optional(),
    CI: z.stringbool().default(false),
  })
  .transform((raw) => ({
    ...raw,
    // Trailing slash is required so relative request paths resolve *under* the API root.
    API_URL: withTrailingSlash(raw.API_URL ?? new URL('api/', withTrailingSlash(raw.BASE_URL)).href),
  }));

export type Env = z.output<typeof EnvSchema>;

function loadEnv(): Readonly<Env> {
  // Treat `KEY=` lines in .env files as unset rather than as invalid empty strings.
  const source = Object.fromEntries(
    Object.keys(EnvSchema.in.shape).map((key) => [key, process.env[key] || undefined]),
  );
  const result = EnvSchema.safeParse({ ...source, TEST_ENV: testEnv });
  if (!result.success) {
    throw new Error(
      `Invalid Limelight environment (TEST_ENV=${testEnv}). Check .env / .env.${testEnv}:\n` +
        z.prettifyError(result.error),
    );
  }
  return Object.freeze(result.data);
}

export const env = loadEnv();
export const isProd = env.TEST_ENV === 'prod';
