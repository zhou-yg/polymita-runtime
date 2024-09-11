import build from "./build"
import fs from 'fs';
import {
  buildApp,
  checkNativeDep,
  generateClientRoutes,
  generateIndexHtml,
  generateReleaseAppPkg,
  generateStaticResources,
  injectElectronBuilderConfig,
  installAppDeps,
  readConfig,
} from '../src/index'

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
    isProd: true,
    isRelease: true,
  })
  // const config = await build(cwd, true)

  await generateClientRoutes(config)
  await buildApp(config)

  generateIndexHtml(config)
  
  generateReleaseAppPkg(config)
  injectElectronBuilderConfig(config)
  generateStaticResources(config)
  
  return;
  checkNativeDep(config)
  await installAppDeps(config)
}
