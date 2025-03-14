import * as esbuild from 'esbuild';
import * as fs from 'node:fs'
import * as path from 'node:path'
import { compile } from 'ejs'
import { IConfig } from '../..';

const esbuildLoadRenderToReactFile = './esbuildLoadRenderToReact.ejs'
const esbuildLoadRenderToReactFilePath = path.join(__dirname, esbuildLoadRenderToReactFile)
const esbuildLoadRegisterModuleFile = './esbuildLoadRegisterModule.ejs'
const esbuildLoadRegisterModuleFilePath = path.join(__dirname, esbuildLoadRegisterModuleFile)

const moduleViewTemplateBuiltinFile = './esbuildLoadViewTemplateBuiltin.ejs'
const moduleViewTemplateBuiltinFilePath = path.join(__dirname, moduleViewTemplateBuiltinFile)

const moduleViewTemplateExternalFile = './esbuildLoadViewTemplateExternal.ejs'
const moduleViewTemplateExternalFilePath = path.join(__dirname, moduleViewTemplateExternalFile)

const moduleViewRenderToReactTemplate = compile(fs.readFileSync(esbuildLoadRenderToReactFilePath).toString())
const moduleViewRegisterModuleTemplate = compile(fs.readFileSync(esbuildLoadRegisterModuleFilePath).toString())
const moduleViewBuiltinTemplate = compile(fs.readFileSync(moduleViewTemplateBuiltinFilePath).toString())
const moduleViewExternalTemplate = compile(fs.readFileSync(moduleViewTemplateExternalFilePath).toString())

const splitImports = (code: string) => {
  const rows = code.split('\n')
  const imports: string[] = []
  const codes: string[] = []

  let importMulti = false

  rows.forEach((row, i) => {
    if (/^import /.test(row)) {
      if (!/from /.test(row) && !/import ('|")/.test(row) && /import[\s]+{/.test(row)) {
        importMulti = true
      }
      imports.push(row)
    } else {
      if (/from /.test(row)) {
        imports.push(row)
        importMulti = false
      } else {
        if (importMulti) {
          imports.push(row)
        } else {
          codes.push(row)
        }
      }
    }
  })

  return {
    imports: imports.join('\n'),
    codes: codes.join('\n')
  }
}

const replaceToRelativeToModule = (config: IConfig, im: string) => {
  return im.replace(new RegExp(`@/${config.modulesDirectory}/`), './')
}

function getName () {

}

export default function loadModuleToView (c: IConfig, arg: {
  modulesDir: string
  modulesDirName: string
  externalModule?: boolean
  onFile: (f: [string, string]) => void
  onlyRegister?: boolean
}): esbuild.Plugin {

  const { onlyRegister, modulesDirName, modulesDir, onFile, externalModule } = arg

  return {
    name: 'loadModuleToView',
    setup(build) {
      build.onResolve({ filter: /(modules|overrides)\/.*/ }, async (args) => {
        return null
      })
      build.onLoad({ filter: /(modules|overrides)\/.*/ }, async (args) => {
        const parsed = path.parse(args.path)
        let { name } = parsed
        if (name === 'index') {
          name = path.parse(parsed.dir).name
        }

        const relativePath = args.path.replace(modulesDir, '').replace(/^\//, '')

        const moduleCode = await fs.promises.readFile(args.path, 'utf8')

        const hasImportSignal = /@polymita\/signal/.test(moduleCode)

        let content1 = '';
        if (externalModule) {
          content1 = moduleViewExternalTemplate({
            moduleImports: `../${modulesDirName}/${relativePath.replace(/\.\w+$/, '')}`
          })
        } else {
          const moduleCodeParts = splitImports(moduleCode)
          content1 = moduleViewBuiltinTemplate({
            name,
            moduleImports: replaceToRelativeToModule(c, moduleCodeParts.imports),
            moduleCode: moduleCodeParts.codes,
            hasImportSignal,
          })
        }

        const content2 = onlyRegister ? moduleViewRegisterModuleTemplate() : moduleViewRenderToReactTemplate({
          name,
          pkgName: c.packageJSON.name,
          hasImportSignal,
        })

        const viewContentTS = content1 + '\n' + content2

        const tsFile = path.join(build.initialOptions.outdir || '', relativePath)
        onFile([tsFile, viewContentTS])
      
        return {
          contents: viewContentTS,
          loader: 'tsx' as esbuild.Loader
        }
      })
    },
  };
};