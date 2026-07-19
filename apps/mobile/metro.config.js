// Metro config for the monorepo: watch the workspace root so the app can resolve
// shared workspace packages (@littlegrip/core) and shared artwork in the
// repo-root assets/ folder (e.g. the mascot required by HomeScreen).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
