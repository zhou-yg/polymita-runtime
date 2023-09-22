import ts from 'typescript'

const LAYOUT_KEYWORD = 'layout'

function pickLayoutAST (fileContent: string) {
  const sourceFile = ts.createSourceFile(
    'file.ts',
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );

  let layoutAST: ts.VariableDeclaration = null;

  function loop (node: ts.Node) {
    if (layoutAST) {
      return;
    }
    node.getChildren().forEach((sub) => {
      // console.log('node: ', ts.SyntaxKind[sub.kind]);
      if (ts.isVariableDeclaration(sub)) {
        if (ts.isIdentifier(sub.name)) {
          if (sub.name.escapedText === LAYOUT_KEYWORD) {
            layoutAST = sub
          }
        }
        return;
      } else {
        loop(sub);
      }
    })
  }
  loop(sourceFile)

  return layoutAST;
}

export function parse (fileContent: string) {
  
  const layoutAST = pickLayoutAST(fileContent)
  console.log('layoutAST: ', layoutAST);
  

  return {}
}