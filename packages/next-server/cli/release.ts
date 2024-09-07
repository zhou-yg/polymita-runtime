import build from "./build"
import fs from 'fs';
import { checkNativeDep, generateReleaseAppPkg, injectElectronBuilderConfig, installAppDeps } from '../src/index'

export default async (cwd: string) => {
  const config = await build(cwd, true)

  const src = config.pointFiles.currentFiles.node_modules;
  const to = config.pointFiles.output.node_modules;

  // if (!fs.existsSync(to) && fs.existsSync(src)) {
  //   fs.symlinkSync(to, src, 'junction');
  // }
  generateReleaseAppPkg(config)

  injectElectronBuilderConfig(config)

  checkNativeDep(config)

  await installAppDeps(config)
}
