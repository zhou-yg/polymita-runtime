import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import { cp } from "shelljs"
import {
  generateModuleTypes,
  composeSchema,
  composeDriver,
  readConfig,
  buildClientRoutes,
  buildViews,
  generateHookDeps,
  logFrame,
  time,
  buildModules,
  buildServerRoutes,
  esbuildServerRoutes,
  generateModuleLayoutTypes,
  resolveNodeModulesLib,
  IConfig,
} from "../src/"
import { buildEverything, prepareDir } from "./dev"

function copyStartDesktopEntry (c: IConfig) {
  if (c.platform === 'desktop') {
    const desktopEntry = resolveNodeModulesLib(c.cwd, 'startDesktop.js')
    cp(desktopEntry, c.pointFiles.outputDir)
  }
}

export default async (cwd: string) => {

  const config = await readConfig({
    cwd,
    isProd: true,
  })

  const allCost = time()

  logFrame(('prepare dir and cp models'))

  prepareDir(config)

  await composeSchema(config)
  composeDriver(config)

  logFrame(('build routes/entryServer/drivers'))

  const cost = time()

  await buildEverything(config)

  copyStartDesktopEntry(config)

  const modelSchema = path.join(cwd, config.modelsDirectory, config.targetSchemaPrisma)
  const modelIndexes = path.join(cwd, config.modelsDirectory, config.schemaIndexes)
  if (fs.existsSync(modelSchema)) {
    cp(modelSchema, path.join(config.pointFiles.outputModelsDir, config.targetSchemaPrisma))
  }
  if (fs.existsSync(modelIndexes)) {
    cp(modelIndexes, path.join(config.pointFiles.outputModelsDir, config.schemaIndexes))
  }
  
  logFrame((`build routes/entryServer/drivers end. cost ${chalk.green(cost())} seconds`))

  logFrame(('start building clientRoutes/views -->'))

  const buildingClientRoutesViewsQueue = ([
    () => buildClientRoutes(config).then(() => {
      logFrame((`build ${chalk.green('clientRoutes')} end. cost ${chalk.green(cost())} seconds`))    
    }),
    () => esbuildServerRoutes(config).then(() => {
      logFrame((`build ${chalk.green('serverRoutes')} end. cost ${chalk.green(cost())} seconds`))
    }),
    () => buildViews(config).then(() => {
      logFrame((`build ${chalk.green('views')} end. cost ${chalk.green(cost())} seconds`))    
    }),
    () => buildModules(config).then(() => {
      logFrame((`build ${chalk.green('modules')} end. cost ${chalk.green(cost())} seconds`))
    }),
    () => generateModuleTypes(config).then(() => {
      logFrame((`build ${chalk.green('modules types')} end. cost ${chalk.green(cost())} seconds`))
    }),
    () => generateModuleLayoutTypes(config).then(() => {
      logFrame((`build ${chalk.green('modules layout types')} end. cost ${chalk.green(cost())} seconds`))
    }),
  ])

  const cost2 = time()

  for (const fp of buildingClientRoutesViewsQueue) {
    await fp()
  }
  logFrame(('<-- finish building clientRoutes/views'))

  logFrame((`build end. cost ${chalk.green(allCost())} seconds`))
}
