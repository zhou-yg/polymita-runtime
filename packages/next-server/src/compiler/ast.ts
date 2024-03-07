import {
  createSourceFile,
  SyntaxKind,
  Node,
  ScriptTarget,
  createProgram,
  SourceFile,
  CallExpression,
} from 'typescript'

interface TSVisitor {
  [k: number]: (node: Node, ancestor: Node[]) => void
}

export function printAST(code, node, depth = 0) {
  console.log(
    new Array(depth + 1).join('----'), 
    SyntaxKind[node.kind],
    `(${node.kind})`,
    code.substring(node.pos, node.end),
    // node.pos,
    // node.end
  );
  depth++;
  node.getChildren().forEach(c => printAST(code, c, depth));
}

function tsWalker (sourceFile: SourceFile, nodes: Node[], visitor: TSVisitor, ancestor: Node[] = []) {
  nodes.forEach(n => {
    const children = n.getChildren(sourceFile)
    const newAncestor = ancestor.concat(n)
    children.forEach(cn => {
      if (visitor[cn.kind]) {
        visitor[cn.kind](cn, newAncestor)
      }
    })
    tsWalker(sourceFile, children, visitor, newAncestor)
  })
}

export const removedFunctionBodyPlaceholder = `() => { /*! can not invoked in current runtime */ }`
export function removeFunctionBody(code: string, names: string[]) {

  const sourceFile = createSourceFile('cfb.ts', code , ScriptTarget.ESNext)
  const nodes = sourceFile.getChildren()

  const bodyRangeArr: [number, number][] = []

  tsWalker(sourceFile, nodes, {
    [SyntaxKind.CallExpression]: (n: CallExpression, a) => {
      const calleeName = n.expression.getText(sourceFile)
      // console.log('n: ', n);
      if (names.includes(calleeName) && n.arguments.length) {
        // console.log('n2: ', code.substring(n.pos, n.end));
        n.arguments.forEach(n => {
          switch (n.kind) {
            case SyntaxKind.ArrowFunction:
            case SyntaxKind.FunctionExpression:
              const { pos, end  } = n
              bodyRangeArr.push([pos, end]);
              break
            case SyntaxKind.Identifier:
              /** @TODO: Identifier maybe a function variable. should climb current scope */
              break
          }
        })
      }
    }
  })

  let gap = 0
  let newCode = code
  bodyRangeArr.forEach(([st, ed], i) => {
    newCode = 
      newCode.substring(0, st - gap) + 
      removedFunctionBodyPlaceholder +
      newCode.substring(ed - gap);
    gap += ed - st - removedFunctionBodyPlaceholder.length
  })
  return newCode
}

