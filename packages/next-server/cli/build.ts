import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import { cp } from "shelljs"
import { buildCommonDirs, buildIndex, buildMeta, buildModelIndexes, buildModules, buildOverrides, buildScripts, buildSignals, buildTailwindCSS, buildThirdPart, composeSchema, composeScripts, composeSignal, copyModelFiles, emptyDirectory, generateBuildingIndex, generateClientRoutes, generateLayoutTypes, generateModelTypes2, generateViewFromModule, generateViewFromOverrides, IConfig, logFrame, preCheckSchema, readConfig, time, upgradePatchVersion } from '../src'

function copyFiles (config: IConfig) {

  if (fs.existsSync(path.join(config.cwd, 'types'))) {
    cp('-r', 
      path.join(config.cwd, 'types'),
      path.join(config.pointFiles.output.root, 'types')
    )
  }
}

export default async (cwd: string, isRelease?: boolean) => {
  const config = await readConfig({
    cwd,
    isProd: true,
    isRelease: !!isRelease,
  })

  emptyDirectory(config.pointFiles.output.root)

  let t1 = time()

  upgradePatchVersion(config)

  await Promise.all([
    composeSchema(config),
    composeSignal(config),
    composeScripts(config),
  ])
  await preCheckSchema(config);

  logFrame(`build compose/checkSchema in ${t1()}s`)

  await Promise.all([
    buildModelIndexes(config),
    generateModelTypes2(config),
    buildCommonDirs(config),
    buildMeta(config),
  ]);

  copyModelFiles(config)
  copyFiles(config)

  logFrame(`build models in ${t1()}s`)

  await Promise.all([
    buildSignals(config),
    generateViewFromModule(config, true),
    generateViewFromOverrides(config, true),
    buildScripts(config),
    buildThirdPart(config),
  ])

  logFrame(`build signals/views/common/scripts in ${t1()}s`)

  await Promise.all([
    buildModules(config),
    buildOverrides(config),
    buildTailwindCSS(config),
  ])
  await generateBuildingIndex(config)
  await buildIndex(config)
  generateLayoutTypes(config)

  logFrame(`build modules/overrides/index in ${t1()}s`)

  return config
}