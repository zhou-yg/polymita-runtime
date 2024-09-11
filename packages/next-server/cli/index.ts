import cacFactory from "cac";
import pkg from '../package.json'
import dev from "./dev";
import build from "./build";
import any from "./any";
import release from "./release";
const cac = cacFactory('tarat-server')

const cwd = process.cwd()

cac
  .command('dev', 'start service for development')
  .option('--port <port>', 'service port', {
    default: '9001'
  })
  .action(async (options: { port: number }) => {
    dev(cwd)
  })

cac
  .command('build', 'compile current project')
  .action(async () => {
    build(cwd)
  })

cac
  .command('release', 'compile current project')
  .action(async () => {
    try {
      await release(cwd)
    } catch (e) {
      console.log('release error: ', e);
    }
  })

cac
  .command('any')
  .action(async () => {
    any(cwd)
  })

cac.help()
cac.version(pkg.version)
cac.parse()

