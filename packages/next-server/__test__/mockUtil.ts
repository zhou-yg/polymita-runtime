import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'fs'
import * as path from 'path'
import {
  readConfig,
} from '../src'
import rimraf from 'rimraf'

export function readMock (n: string) {

  return readFileSync(path.join(__dirname, './mocks/drivers', n)).toString()
}

export function writeDepsMock (n: string, deps: any) {

  return writeFileSync(path.join(__dirname, './mocks', `.${n}.deps.json`), JSON.stringify(deps))
}

export function readMockProjectConfig (n: string) {
  const cwd = path.join(__dirname, '../../server-mocks/', n)

  return readConfig({
    cwd,
    isProd: true
  })
}
export function resetMockProjectConfig (n: string) {
  const cwd = path.join(__dirname, '../../server-mocks/', n)

  rimraf.sync(path.join(cwd, 'dist'))
  rimraf.sync(path.join(cwd, 'app/polymita'))
}
