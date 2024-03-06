import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'fs'
import * as path from 'path'
import {
  readConfig,
  http
} from '../src'

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

export async function startTestServer () {
  const cwd = path.join(__dirname, './mockProject')
  const config = await readConfig({
    cwd,
  })

  const app = await http.createDevServer(config)

  return app
}


export const driverFilesMap = {
  imports: `
import 'foo'
import XX from 'foo'
import BB, { aa } from 'foo'
import { bb } from 'foo'
import * as CC from 'foo'
function aFunc() {  
  aa()
}
bb()
const d = cc.aa.bb`,
  withExport: `
import d2 from './a'
import d3 from './b'
export { d2 as default }`,
  withExport2: `
import d3 from './b'
import d2 from './a'
export default { d2 }`
}
