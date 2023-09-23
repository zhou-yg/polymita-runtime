import { log } from 'node:console';
import ts from 'typescript'

const LAYOUT_KEYWORD = 'layout'

function logNode (node: ts.Node, depth = 0) {
  console.log('|' + '_'.repeat(depth * 2), ts.SyntaxKind[node.kind], `(${node.getText()})`);
  node.getChildren().forEach((sub) => {
    logNode(sub, depth + 1)
  })
}

function pickLayoutAST (fileContent: string) {
  const sourceFile = ts.createSourceFile(
    'file.tsx',
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

function pickRootJSXFromLayoutDeclaration (layoutAST: ts.VariableDeclaration) {
  let rootJSX: ts.JsxElement = null;

  function loop (node: ts.Node) {
    if (rootJSX) {
      return;
    }
    node.getChildren().forEach((sub) => {
      if (rootJSX) {
        return;
      }
      if (ts.isJsxElement(sub)) {
        rootJSX = sub
        return;
      } else {
        loop(sub);
      }
    })
  }
  loop(layoutAST)

  return rootJSX;
}

function buildJSONTree (root: ts.JsxElement) {
  const t1 = root.openingElement.getText()  
  console.log('t1: ', t1);
  const t2 = root.closingElement.getText();
  console.log('t2: ', t2);
}

export function parse (fileContent: string) {
  
  const layoutAST = pickLayoutAST(fileContent)
  
  const rootJSX = pickRootJSXFromLayoutDeclaration(layoutAST)
  console.log('rootJSX: ', rootJSX);

  if (rootJSX) {
    const jsonTree = buildJSONTree(rootJSX)
    console.log('jsonTree: ', jsonTree);
  }

  return {}
}