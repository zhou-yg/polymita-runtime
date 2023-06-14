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
} from "../src/"
import { buildEverything, prepareDir } from "./dev"

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

  const modelSchema = path.join(cwd, config.modelsDirectory, config.targetSchemaPrisma)
  const modelIndexes = path.join(cwd, config.modelsDirectory, config.schemaIndexes)
  if (fs.existsSync(modelSchema)) {
    cp(modelSchema, path.join(config.pointFiles.outputModelsDir, config.targetSchemaPrisma))
  }
  if (fs.existsSync(modelIndexes)) {
    cp(modelIndexes, path.join(config.pointFiles.outputModelsDir, config.schemaIndexes))
  }
  
  logFrame((`build routes/entryServer/drivers end. cost ${chalk.green(cost())} seconds`))

  logFrame(('build clientRoutes/views'))

  const cost2 = time()

  await Promise.all([
    buildClientRoutes(config).then(() => {
      logFrame((`build ${chalk.green('clientRoutes')} end. cost ${chalk.green(cost2())} seconds`))    
    }),
    buildViews(config).then(() => {
      logFrame((`build ${chalk.green('views')} end. cost ${chalk.green(cost2())} seconds`))    
    }),
    buildModules(config).then(() => {
      logFrame((`build ${chalk.green('modules')} end. cost ${chalk.green(cost2())} seconds`))
    }),
    generateModuleTypes(config).then(() => {
      logFrame((`build ${chalk.green('modules')} end. cost ${chalk.green(cost2())} seconds`))
    })
  ])

  logFrame((`build end. cost ${chalk.green(allCost())} seconds`))
}
