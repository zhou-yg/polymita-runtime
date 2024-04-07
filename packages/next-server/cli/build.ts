import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import { cp } from "shelljs"
import { buildModelIndexes, buildModules, buildSignals, buildTailwindCSS, composeSchema, composeSignal, copyModelFiles, generateLayoutTypes, generateModelTypes2, generateViewFromModule, IConfig, logFrame, preCheckSchema, readConfig, time } from '../src'

function copyFiles (config: IConfig) {
  copyModelFiles(config)

  cp('-r', 
    path.join(config.cwd, 'types'),
    path.join(config.pointFiles.outputDir, 'types')
  )
}

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
    isProd: true,
  })

  await Promise.all([
    composeSchema(config),
    composeSignal(config)  
  ])
  await preCheckSchema(config);
  await Promise.all([
    buildModelIndexes(config),
  ])
  await generateModelTypes2(config)

  let t1 = time()

  await buildSignals(config)

  logFrame(`build signals in ${t1()}s`)

  await Promise.all([
    generateViewFromModule(config),
    buildModules(config),
    buildTailwindCSS(config),
  ])
  generateLayoutTypes(config)

  logFrame(`build views in ${t1()}s`)

  copyFiles(config)
 
}