const path = require("path");
const pkg = require("../packages/core/package.json");
const lifecyclePkg = require("../packages/lifecycle/package.json");

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: false, // not reliable anyway
    },
  },
  dependencies: {
    [pkg.name]: {
      root: path.join(__dirname, "../packages/core"),
      platforms: {
        // Codegen script incorrectly fails without this
        // So we explicitly specify the platforms with empty object
        ios: {},
        android: {},
      },
    },
    [lifecyclePkg.name]: {
      root: path.join(__dirname, "../packages/lifecycle"),
      platforms: {
        ios: {},
        android: {},
      },
    },
  },
};
