import * as path from 'node:path'
import * as fs from 'node:fs'
import chalk from 'chalk'
import chokidar, { FSWatcher } from 'chokidar'
import {
  readConfig,
  driversType,
  composeSchema,
  buildModelIndexes,
  buildViews,
  buildDrivers,
  IConfig,
  time,
  logFrame,
  generateHookDeps,
  tryMkdir,
} from "../src/"
import { chokidarOptions, prepareDir, watchByConfig } from './dev'
import { createTestServer } from '../src/server'
import { spawn } from 'node:child_process'
import exitHook from 'exit-hook'

async function buildForTesting(c: IConfig) {
  const cost = time()

  await buildModelIndexes(c).then(() => {
    logFrame(`build modelIndexes end. cost ${chalk.green(cost())} sec`)
  })

  await buildDrivers(c).then(() => {
    generateHookDeps(c)
    logFrame(`build drivers end. cost ${chalk.green(cost())} sec`)
  })

  // watching
  return

  const driversWatcher = chokidar.watch([
    path.join(c.cwd, c.driversDirectory),
  ], chokidarOptions())

  watchByConfig(
    c.cwd, 
    [
      {
        watcher: driversWatcher,
        name: 'driver',
        event: 'change',
        callbacks: [buildDrivers]
      },
      {
        watcher: driversWatcher,
        name: 'driver',
        event: 'add',
        callbacks: [buildDrivers]
      },
    ]
  );
  logFrame(`start watching drivers`)
  exitHook(() => {
    console.log('[buildForTesting] exit hook callback')
    driversWatcher.close()
  })
}

const driverTemplate = (name: string, testCacheDir: string) => `
import clientDriver from '../../${testCacheDir}/client/drivers/cjs/${name}'
import serverDriver from '../../${testCacheDir}/server/drivers/cjs/${name}'

describe('test driver/${name}', () => {
  describe('client', () => {
    
  })
  describe('server', () => {

  })
})
`.trim()

const jestConfigTemp = () => `
const isCI = process.env.TEST === 'CI'

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: isCI,
  collectCoverageFrom: [
    './drivers/**/*.ts',
  ]
};
`.trim()

function initializeTestFiles (c: IConfig, op:TestOptions) {
  const testDriversDir = path.join(c.testDirectory, c.driversDirectory)
  tryMkdir(testDriversDir)
  
  if (op.bootstrap) {
    c.drivers.forEach((driver) => {
      const driverFile = path.join(testDriversDir, driver.name + '.test.ts')
      if (!fs.existsSync(driverFile)) {
        fs.writeFileSync(driverFile, driverTemplate(driver.name, c.testCacheDirectory))
      }
    });
  
    if (!fs.existsSync(path.join(c.cwd, 'jest.config.js'))) {
      fs.writeFileSync(path.join(c.cwd, 'jest.config.js'), jestConfigTemp())
    }
  }
}

export interface TestOptions {
  bootstrap?: boolean,
  port?: number,
  watch?: boolean
  coverage?: boolean
  serverOnly?: boolean
}

function runJest (c: IConfig) {
  const instance = spawn(
    'npx',
    [
      "jest",
      "--runInBand"
    ],
    {
      cwd: c.cwd,
      stdio: 'inherit',
      env: {
        TEST_SERVER_PORT: String(c.port),
      },
    }
  )
  instance.on('error', e => {
    console.log('[runJest] e: ', e);
  })
  exitHook(() => {
    console.log('[runJest] exit hook callback')
    instance.kill()
  })


  return instance
}

export default async (cwd: string, options: TestOptions) => {

  const config = await readConfig({
    cwd,
    isProd: 'test',
    port: options.port,
  })

  prepareDir(config)

  initializeTestFiles(config, options)

  // await buildForTesting(config)

  // run server & execute jest
  // await createTestServer(config)

  if (!options.serverOnly) {
    runJest(config)
  }
}