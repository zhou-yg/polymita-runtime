import * as esbuild from 'esbuild';
import * as fs from 'node:fs'
import * as path from 'node:path'
import { compile } from 'ejs'
import { traverseDir } from "../../util";

const moduleViewTemplateFile = './esbuildLoadViewTemplate.ejs'
const moduleViewTemplateFilePath = path.join(__dirname, moduleViewTemplateFile)

const moduleViewTemplate = compile(fs.readFileSync(moduleViewTemplateFilePath).toString())

const splitImports = (code: string) => {
  const rows = code.split('\n')
  const imports: string[] = []
  const codes: string[] = []

  rows.forEach(row => {
    if (/^import /.test(row)) {
      imports.push(row)
    } else {
      codes.push(row)
    }
  })

  return {
    imports: imports.join('\n'),
    codes: codes.join('\n')
  }
}

export default function loadModuleToView (cwd: string): esbuild.Plugin {

  return {
    name: 'loadModuleToView',
    setup(build) {
      build.onResolve({ filter: /modules\/.*/ }, async (args) => {
        console.log('resolve modules args: ', args);
        return null
      })
      build.onLoad({ filter: /modules\/.*/ }, async (args) => {
        const { name } = path.parse(args.path)
        const moduleCode = await fs.promises.readFile(args.path, 'utf8')

        const moduleCodeParts = splitImports(moduleCode)

        const viewContent = moduleViewTemplate({
          name,
          moduleImports: moduleCodeParts.imports,
          moduleCode: moduleCodeParts.codes,
        })
        return {
          contents: viewContent,
          loader: 'tsx'
        }
      })
    },
  };
};