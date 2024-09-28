import * as path from 'path'
import * as fs from 'fs'
import ts from 'typescript'
import { traverse } from '../../util';
import { IConfig } from '../../config';

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

  let layoutAST: ts.VariableDeclaration | undefined;

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

  return { sourceFile, layoutAST };
}

function pickRootJSXFromLayoutDeclaration (layoutAST: ts.VariableDeclaration | undefined) {
  let rootJSX: ts.JsxElement | undefined;

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
  if (layoutAST) {
    loop(layoutAST)
  }

  return rootJSX;
}

function isCustomComponentType (type: string) {
  return /^[A-Z]/.test(type)
}

function isCustomComponentTypeNode(val: any): val is JSONTreeComponent {
  return val && val.component
}

function buildJSONTree (root: ts.JsxElement) {
  
  function loop (node: ts.Node) {
    if (ts.isJsxElement(node)) {
      const type = node.openingElement.tagName.getText();
      return {
        type,
        component: isCustomComponentType(type),
        children: node.children.map(loop).filter(Boolean),
      }      
    }
    if (ts.isJsxSelfClosingElement(node)) {
      const type = node.tagName.getText();
      return {
        type,
        component: isCustomComponentType(type),
      }
    }
  }

  const tree: JSONTree = loop(root);
  
  return tree;
}

const CREATE_COMPONENT_METHOD = 'createFunctionComponent'

function appendConstructorComponent (json: JSONTree, file: ts.Node) {

  function search (top: ts.Node, variableName: string) {

    let originConstructorName: string = '';

    function loop (node: ts.Node) {
      if (originConstructorName) {
        return;
      }
      node.getChildren().forEach(node => loop(node));
      
      if (
        ts.isVariableDeclaration(node) && 
        node.initializer &&
        ts.isCallExpression(node.initializer) && 
        node.initializer.expression?.getText() === CREATE_COMPONENT_METHOD
      ) {
        const moduleName = node.initializer.arguments?.[0].getText();
        if (moduleName && /Module$/.test(moduleName)) {
          originConstructorName = moduleName
        }
      }
    }

    loop(top)

    return originConstructorName;
  }
  
  traverse(json, (key, val) => {
    if (isCustomComponentTypeNode(val)) {
      val.ConstructorComponentType = search(file, val.type);
    }
  })

  return json
}


interface JSONTreeNode {
  type: string;
  children?: JSONTree[];
  component: false;
}
interface JSONTreeComponent {
  type: string;
  children?: JSONTree[];
  component: true;
  ConstructorComponentType: string;
}

type JSONTree = JSONTreeNode | JSONTreeComponent;

export function parse (fileContent: string) {
  
  const { sourceFile, layoutAST} = pickLayoutAST(fileContent)
  
  const rootJSX = pickRootJSXFromLayoutDeclaration(layoutAST)

  if (!rootJSX) {
    return;
  }

  const jsonTree = buildJSONTree(rootJSX)
  
  appendConstructorComponent(jsonTree, sourceFile)
  
  return jsonTree
}

export function toTSD (json: JSONTree) {
  return JSON.stringify(json, (k, v) => {
    if (
      typeof v === 'object' ||
      k === '' ||
      k === 'type' || 
      k === 'children'
    ) {
      return v;
    }
  }, 2)
}

export function generateLayoutTypes (c: IConfig) {
  const destDir = c.isProd ? c.pointFiles.output.modulesDir : c.pointFiles.generates.viewsDir
  const modulesDir = path.join(c.cwd, c.modulesDirectory)

  c.pointFiles.currentFiles.moduleFiles.forEach(f => {

    const content = fs.readFileSync(f.path, 'utf-8')
    const jsonTree = parse(content)

    const dts = jsonTree ? toTSD(jsonTree) : '{}';

    const relativeName = f.path.replace(modulesDir, '').replace(/\.\w+$/, '')

    fs.writeFileSync(
      path.join(destDir, `${relativeName}.layout.d.ts`),
      `export type LayoutTypes = ${dts}`
    )
  })
}