import build from "./build"
import fs from 'fs';
import {
  buildApp,
  buildTailwindCSS,
  checkNativeDep,
  generateClientRoutes,
  generateIndexHtml,
  generateMainFiles,
  generateReleaseAppPkg,
  generateStaticResources,
  injectElectronBuilderConfig,
  installAppDeps,
  linkModules,
  mergePolymitaDeps,
  readConfig,
} from '../src/index'

export default async (cwd: string) => {
  // const config = await readConfig({
  //   cwd,
  //   isProd: true,
  //   isRelease: true,
  // })
  const config = await build(cwd, true)

  await buildApp(config)

  await buildTailwindCSS(config)

  generateIndexHtml(config)
  generateMainFiles(config)
  
  generateReleaseAppPkg(config)
  injectElectronBuilderConfig(config)
  generateStaticResources(config)
  
  // mergePolymitaDeps(config)

  checkNativeDep(config)
  await installAppDeps(config)
  // linkModules(config)
}
