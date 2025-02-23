import cacFactory from "cac";
import pkg from '../package.json'
import dev from "./dev";
import build from "./build";
import any from "./any";
import release from "./release";
import start from "./start";
import zip from "./zip";
import upload from "./upload";
import prisma from "./prisma";
import { assignCommandsToProject } from "../src/util";

export * as nextServer from '../src/index'

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
  .command('prisma', 'compose prisma schema and generate')
  .action(async (options: { port: number }) => {
    prisma(cwd)
  })

cac
  .command('build', 'compile current project')
  .action(async () => {
    build(cwd)
  })
cac
  .command('start', 'compile current project')
  .action(async () => {
    start(cwd)
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
  .command('zip', 'create zip file after build')
  .option('-d, --deps', 'copy node_modules', {
    default: false,
  })
  .action(async ({ deps }) => {
    try {
      await zip(cwd, { copyDeps: deps })
    } catch (e) {
      console.log('zip error: ', e);
    }
  })


cac
  .command('upload', 'upload zip to market-service')
  .option('--local <port>', 'local service port', {
    default: '9500'
  })
  .action(async ({ local }) => {
    try {
      await upload(cwd, {
        localPort: local,
      })
    } catch (e) {
      console.log('upload error: ', e);
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

assignCommandsToProject(cwd, [
  ...cac.commands.map(c => c.name),
  ['local', 'npm run zip && npm run upload']
])