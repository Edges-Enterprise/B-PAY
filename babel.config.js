// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Add this line - it's mandatory for Reanimated 3.x
      'react-native-reanimated/plugin', // <-- MUST BE LAST
    ],
  };
};