/* chain.js
 *
 * A babel plugin that redefines the :: operator to act as a function
 * pipeline instead of binding 'this'.
 *
 * Example:
 *
 *   ['a', 'b', 'c']::map(x => x + '!')::join('-')
 *
 * Would be transformed into:
 *
 *   join('-', map(x => x + '!', ['a', 'b', 'c']))
 */

require('@babel/plugin-syntax-function-bind')

module.exports = function(babel) {
  const { types: t } = babel

  return {
    name: 'immune-chain',
    visitor: {
      CallExpression(path) {
        var node = path.node,
          scope = path.scope

        if (t.isBindExpression(node.callee))
          path.replaceWith(
            t.callExpression(node.callee.callee, [
              ...(node.arguments || []),
              node.callee.object,
            ]),
          )
      },
    },
  }
}
