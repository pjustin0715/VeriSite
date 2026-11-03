module.exports = () => ({
  postcssPlugin: "postcss-unwrap-layers",
  AtRule: {
    layer(atRule) {
      if (atRule.nodes && atRule.nodes.length > 0) {
        atRule.replaceWith(atRule.nodes);
      } else {
        atRule.remove();
      }
    },
  },
});
module.exports.postcss = true;

