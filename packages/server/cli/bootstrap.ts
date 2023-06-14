import chalk from "chalk";
import { spawn } from "child_process";
import {
  readConfig,
  composeSchema,
  composeDriver,
  IConfig,
  logFrame
} from "../src";

function initializePrismaDEV (config: IConfig) {
  const instance = spawn('npm', ['run', 'p:dev'], {
    cwd: config.cwd,
    stdio: [process.stdin, process.stdout, process.stderr]
  })

  return new Promise<void>((resolve, reject) => {
    instance.on('close', () => {
      resolve()
    })
    instance.on('error', () => {
      reject()
    })
  })
}
function initializePrismaGEN (config: IConfig) {
  const instance = spawn('npm', ['run', 'p:gen'], {
    cwd: config.cwd,
    stdio: [process.stdin, process.stdout, process.stderr]
  })

  return new Promise<void>((resolve, reject) => {
    instance.on('close', () => {
      resolve()
    })
    instance.on('error', () => {
      reject()
    })
  })
}

export default async function bootstrap (cwd: string) {
  logFrame(`bootstrap starting`)

  const config = await readConfig({
    cwd,
    isProd: true,
  })

  await initializePrismaGEN(config)

  composeSchema(config)
  composeDriver(config)
 
  await initializePrismaDEV(config)

  logFrame(`bootstrap done. please run command "${chalk.green('npm run dev')}"`)
}