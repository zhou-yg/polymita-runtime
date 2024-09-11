import {
  createServer,
  generateClientRoutes,
  buildApp,
  readConfig,
} from '../src'


export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
    isProd: true,
  })

  await buildApp(config)

  createServer(config)
}