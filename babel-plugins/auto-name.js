/* auto-name.js
 *
 * A babel plugin that automativally adds a name to Type's, Union's and Protocols.
 *
 * For example the following input:
 *
 *   const State = Type({ items: [string] })
 *   const Maybe = Union({ Some: [Any], None: [] })
 *   const IFunctor = Protocol({ map: ['f', 'xs'] })
 *
 * Would be transformed to the following output:
 *
 *   const State = Type("State", { items: [string] })
 *   const Maybe = Union("Maybe", { Some: [Any], None: [] })
 *   const IFunctor = Protocol("IFunctor", { map: ['f', 'xs'] })
 *
 * However, the following input:
 *
 *   const State = Type('MyState', { items: [string] })
 *   const Maybe = Union('MyMaybe', { Some: [Any], None: [] })
 *   const IFunctor = Protocol("MyFunctor", { map: ['f', 'xs'] })
 *
 * Would remain unchanged as names are already provided.
 */

module.exports = function(babel) {
  const { types: t } = babel

  const isType = node =>
    (node.init && node.init.callee && node.init.callee.name === 'Type') ||
    (node.value && node.value.callee && node.value.callee.name === 'Type')

  const isUnion = node =>
    (node.init && node.init.callee && node.init.callee.name === 'Union') ||
    (node.value && node.value.callee && node.value.callee.name === 'Union')

  const isProtocol = node =>
    (node.init && node.init.callee && node.init.callee.name === 'Protocol') ||
    (node.value && node.value.callee && node.value.callee.name === 'Protocol')

  return {
    name: 'immune-auto-name',
    visitor: {
      VariableDeclaration(path, env) {
        const node = path.node.declarations[0]

        if (!node.init) return

        if (
          node.init.arguments &&
          (node.init.arguments.length === 0 ||
            isType(node) ||
            isUnion(node) ||
            isProtocol(node))
        ) {
          if (
            node.init.arguments[0] &&
            node.init.arguments[0].type !== 'StringLiteral'
          )
            node.init.arguments.unshift(t.stringLiteral(node.id.name))
        }
      },

      ObjectProperty(path, env) {
        const node = path.node

        if (!isType(node) && !isUnion(node) && !isProtocol(node)) return

        if (isType(node) || isUnion(node) || isProtocol(node))
          if (
            path.node.value.arguments &&
            (path.node.value.arguments.length === 0 ||
              path.node.value.arguments[0].type !== 'StringLiteral')
          )
            path.node.value.arguments.unshift(
              t.stringLiteral(path.node.key.name),
            )
      },
    },
  }
}
