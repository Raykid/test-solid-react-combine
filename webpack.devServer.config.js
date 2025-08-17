const { merge } = require("webpack-merge");
const { getPort } = require("portfinder-sync");

process.argv.splice(2, 1, "--env", "development");
const baseConfig = require("./webpack.config");

const port = getPort(1301);

module.exports = merge(baseConfig, {
  devServer: {
    port,
    open: true,
  },
});
