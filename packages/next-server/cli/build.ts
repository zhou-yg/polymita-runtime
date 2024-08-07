import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import { cp } from "shelljs"
import { buildCommonDirs, buildModelIndexes, buildModules, buildOverrides, buildScripts, buildSignals, buildTailwindCSS, composeSchema, composeScripts, composeSignal, copyModelFiles, emptyDirectory, generateLayoutTypes, generateModelTypes2, generateViewFromModule, generateViewFromOverrides, IConfig, logFrame, preCheckSchema, readConfig, time } from '../src'

function copyFiles (config: IConfig) {
  copyModelFiles(config)

  if (fs.existsSync(path.join(config.cwd, 'types'))) {
    cp('-r', 
      path.join(config.cwd, 'types'),
      path.join(config.pointFiles.outputDir, 'types')
    )
  }
}

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
    isProd: true,
  })

  emptyDirectory(config.pointFiles.outputDir)

  let t1 = time()

  await Promise.all([
    composeSchema(config),
    composeSignal(config),
    composeScripts(config),
  ])
  await preCheckSchema(config);

  logFrame(`build compose/checkSchema in ${t1()}s`)

  await Promise.all([
    buildModelIndexes(config),
    generateModelTypes2(config)
  ])

  logFrame(`build models in ${t1()}s`)

  await Promise.all([
    buildSignals(config),
    generateViewFromModule(config, true),
    generateViewFromOverrides(config, true),
    buildCommonDirs(config),
    buildScripts(config),
  ])

  logFrame(`build signals/views/common/scripts in ${t1()}s`)

  await Promise.all([
    buildModules(config),
    buildOverrides(config),
    buildTailwindCSS(config),
  ])
  generateLayoutTypes(config)

  logFrame(`build modules/overrides in ${t1()}s`)

  copyFiles(config)
 
}