const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('ts-node/register');
require('tsconfig-paths/register');

function getCliFeaturePaths() {
  return process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith('-'))
    .filter((arg) => arg.includes('.feature'));
}

const cliFeaturePaths = getCliFeaturePaths();
const parallel = Number(process.env.CUCUMBER_PARALLEL ?? 2);

module.exports = {
  default: {
    requireModule: ['ts-node/register', 'tsconfig-paths/register'],
    require: ['tests/features/**/*.steps.ts', 'tests/support/**/*.ts'],
    paths: cliFeaturePaths.length > 0 ? cliFeaturePaths : ['tests/features/**/*.feature'],
    parallel,
    format: [
      process.env.TEST_ENVIRONMENT === 'ci' ? 'progress' : 'progress-bar',
      'json:test-results/cucumber-report.json',
      'summary:test-results/summary.txt',
    ],
    publishQuiet: true,
  },
};
