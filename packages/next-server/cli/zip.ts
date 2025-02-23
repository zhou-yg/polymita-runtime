import { copyNodeModules, logFrame, zipOutput } from '../src'
import build from './build'

export default async (cwd: string, options?: {
  copyDeps: boolean
}) => {
  const config = await build(cwd, false)

  if (options?.copyDeps) {
    copyNodeModules(config)
  }

  await zipOutput(config)

  logFrame('zip success at:', config.pointFiles.output.zip)

  return config
}
