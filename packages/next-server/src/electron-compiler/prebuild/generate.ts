import fs from 'fs';
import * as path from 'path'
import chalk from 'chalk';
import { compile } from 'ejs'
import { spawn, execSync } from 'child_process';
import { IConfig } from '../../config';
import { pageTemplate } from '../../server/middlewares/page';
import { combineStaticToCode } from '../../config/deps';
import { implicitImportPath } from '../../util';

function toElectronAppRelativePath(c: IConfig, p: string) {
  return p.replace(c.pointFiles.generates.electronAppDir, '.')
}

const releaseAppPkgTemplateFile = './appPackageJSON.ejs'
const releaseAppPkgFilePath = path.join(__dirname, releaseAppPkgTemplateFile)
const releaseAppPkgTemplate = compile(fs.readFileSync(releaseAppPkgFilePath).toString())

export function generateReleaseAppPkg(c: IConfig) {
  const pkg = releaseAppPkgTemplate({
    name: c.packageJSON.name,
    version: c.packageJSON.version,
    main: toElectronAppRelativePath(c, c.pointFiles.generates.app.main),
  })
  fs.writeFileSync(c.pointFiles.generates.app.pkgJSON, pkg)
}


export const generateStaticResources = (c: IConfig) => {
  fs.mkdirSync(c.pointFiles.generates.app.staticResourcesDir, { recursive: true })
  c.staticDeps.forEach(dep => {
    const code = combineStaticToCode(dep.resources)
    
    fs.writeFileSync(path.join(c.pointFiles.generates.app.staticResourcesDir, dep.name), code)
  })
}