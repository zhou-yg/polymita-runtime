import { buildModelIndexes, composeSchema, generateModelTypes2, preCheckSchema, readConfig, tryMkdir } from "../src"

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
  })

  const { modelDir } = config.pointFiles.currentFiles.modelFiles
  tryMkdir(modelDir)

  await composeSchema(config);

  await preCheckSchema(config);
  
  await Promise.all([
    buildModelIndexes(config),
    generateModelTypes2(config),
  ])

}