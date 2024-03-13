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

function getName () {

}

export default function loadModuleToView (arg: {
  modulesDir: string
  onFile: (f: [string, string]) => void
}): esbuild.Plugin {

  const { modulesDir, onFile } = arg

  return {
    name: 'loadModuleToView',
    setup(build) {
      build.onResolve({ filter: /modules\/.*/ }, async (args) => {
        return null
      })
      build.onLoad({ filter: /modules\/.*/ }, async (args) => {
        const parsed = path.parse(args.path)
        let { name } = parsed
        if (name === 'index') {
          name = path.parse(parsed.dir).name
        }

        const relativePath = args.path.replace(modulesDir, '')

        const moduleCode = await fs.promises.readFile(args.path, 'utf8')

        const moduleCodeParts = splitImports(moduleCode)

        const viewContentTS = moduleViewTemplate({
          name,
          moduleImports: moduleCodeParts.imports,
          moduleCode: moduleCodeParts.codes,
        })

        const tsFile = path.join(build.initialOptions.outdir, relativePath)
        onFile([tsFile, viewContentTS])
      
        return {
          contents: viewContentTS,
          loader: 'tsx'
        }
      })
    },
  };
};