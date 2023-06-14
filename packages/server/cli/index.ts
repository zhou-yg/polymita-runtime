import cacFactory from "cac";
import pkg from '../package.json'
import dev from "./dev";
import build from './build'
import start from './start'
import any from "./any";
import bootstrap from "./bootstrap";
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
  .command('start', 'starting project as service')
  .action(async () => {
    start(cwd)
  })
cac
  .command('bootstrap', 'initialize the project')
  .action(() => {
    bootstrap(cwd)
  })

cac
  .command('any')
  .action(async () => {
    any(cwd)
  })
cac.help()
cac.version(pkg.version)
cac.parse()

