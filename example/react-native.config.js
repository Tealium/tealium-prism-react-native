const path = require('path');
// Core library now lives at packages/core/ (monorepo restructure); the repo
// root package.json is just the workspace manager, so resolve the library
// package explicitly.
const pkg = require('../packages/core/package.json');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  dependencies: {
    [pkg.name]: {
      root: path.join(__dirname, '..', 'packages', 'core'),
      platforms: {
        // Codegen script incorrectly fails without this
        // So we explicitly specify the platforms with empty object
        ios: {},
        android: {},
      },
    },
  },
};
