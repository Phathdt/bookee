import * as path from 'node:path';

import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export enum BrowserType {
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  WEBKIT = 'webkit',
}

export enum TestEnvironment {
  LOCAL = 'local',
  CI = 'ci',
}

export enum TraceMode {
  OFF = 'off',
  ON = 'on',
  RETAIN_ON_FAILURE = 'retain-on-failure',
}

export const TimeoutValue = {
  QUICK_CHECK: 1_000,
  ACTION: 10_000,
  NAVIGATION: 10_000,
  EXPECT: 10_000,
  TEST_LOCAL: 30_000,
  TEST_CI: 60_000,
  TEST_WORKFLOW: 120_000,
} as const;
export type TimeoutValue = (typeof TimeoutValue)[keyof typeof TimeoutValue];

export interface TestConfig {
  browser: BrowserType;
  headless: boolean;
  viewportWidth: number;
  viewportHeight: number;
  trace: TraceMode;
  logLevel: LogLevel;
  timeout: TimeoutValue;
}

export const testConfigPresets: Record<TestEnvironment, TestConfig> = {
  [TestEnvironment.LOCAL]: {
    browser: BrowserType.CHROMIUM,
    headless: true,
    viewportWidth: 1366,
    viewportHeight: 768,
    trace: TraceMode.RETAIN_ON_FAILURE,
    logLevel: LogLevel.INFO,
    timeout: TimeoutValue.TEST_LOCAL,
  },
  [TestEnvironment.CI]: {
    browser: BrowserType.CHROMIUM,
    headless: true,
    viewportWidth: 1366,
    viewportHeight: 768,
    trace: TraceMode.RETAIN_ON_FAILURE,
    logLevel: LogLevel.INFO,
    timeout: TimeoutValue.TEST_CI,
  },
};

function resolveEnv(): TestEnvironment {
  const env = (process.env.TEST_ENVIRONMENT ?? 'local') as TestEnvironment;
  if (!testConfigPresets[env]) {
    throw new Error(`Invalid TEST_ENVIRONMENT: ${env}`);
  }
  return env;
}

const preset = testConfigPresets[resolveEnv()];
export default preset;
