import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { prepareDir } from "../../cli/dev"
import {
  removedFunctionBodyPlaceholder,
  transformCommonDriver,
  buildDrivers, readConfig, readFiles, traverse, traverseDir,
  composeDriver
} from "../../src"
import { readMockProjectConfig } from "../mockUtil"

jest.setTimeout(10 * 1000)

describe('driver compiler', () => {
  it('use relative references', async () => {
    const config = await readMockProjectConfig('someDrivers')
    prepareDir(config)

    await buildDrivers(config)

    const { outputDriversDir, outputClientDriversDir, outputServerDriversDir } = config.pointFiles
    // check js file rows in outputDriversDir
    readFiles(outputDriversDir, '.js').forEach(file => {
      const jsContent = readFileSync(file).toString()
      const rows = jsContent.split('\n')
      expect(rows.length).toBeLessThan(50)
    })

    const r1 = readFileSync(join(outputClientDriversDir, 'a.js')).toString().match(/var autoParser/g);
    const r2 = readFileSync(join(outputClientDriversDir, 'b.js')).toString().match(/var autoParser/g);
    expect(r1.length).toBe(1)
    expect(r2.length).toBe(2)
  }, 15 * 1000)

  it('generate compose driver', async () => {
    const config = await readMockProjectConfig('someDrivers')
    prepareDir(config)

    await composeDriver(config)

    const { composeDriversDirectory, driversDirectory } = config
    const destComposeDriversDir = join(config.cwd, driversDirectory, composeDriversDirectory)
    const files = readdirSync(destComposeDriversDir)
    expect(files.length).toBeGreaterThan(0)
  })

  it('generate driver with compose', async () => {
    const config = await readMockProjectConfig('someDrivers')
    prepareDir(config)

    await composeDriver(config)
    await buildDrivers(config)

    const { composeDriversDirectory, driversDirectory } = config
    const { outputServerDriversDir, outputClientDriversDir } = config.pointFiles

    const destServerComposeDriversDir = join(outputServerDriversDir, composeDriversDirectory)
    const destClientComposeDriversDir = join(outputClientDriversDir, composeDriversDirectory)

    const files = readdirSync(destServerComposeDriversDir).filter(f => f.endsWith('.js'))
    expect(files.length).toBeGreaterThan(0)
    // validate require path in result file
    files.forEach(file => {
      const jsContent = readFileSync(join(destServerComposeDriversDir, file)).toString()
      expect(jsContent).toContain('tarat-cascading-list/dist/server/drivers/cjs')
    })

    const files2 = readdirSync(destClientComposeDriversDir).filter(f => f.endsWith('.js'))
    expect(files2.length).toBeGreaterThan(0)
    files2.forEach(file => {
      const jsContent = readFileSync(join(destClientComposeDriversDir, file)).toString()
      expect(jsContent).toContain('tarat-cascading-list/dist/client/drivers/esm')
    })

  }, 15 * 1000)

  it('generate common driver', async () => {
    const config = await readMockProjectConfig('someDrivers')
    prepareDir(config)

    await transformCommonDriver(config)
    const { outputDriversDir } = config.pointFiles
    const files = readdirSync(outputDriversDir).filter(f => f.endsWith('.js'))
    files.forEach((f) => {
      const content = readFileSync(join(outputDriversDir, f)).toString()
      expect(content).not.toContain(removedFunctionBodyPlaceholder)
    })
  })
})