import path from 'node:path'
import fs from 'node:fs'
import {
  buildModules, traverseDir,
  buildViews,
  generateModuleTypes,
} from '../../src'
import { readMockProjectConfig } from '../mockUtil'

describe('compile module', () => {
  it('compile modules', async () => {
    const c = await readMockProjectConfig('hasModules')

    await buildModules(c)

    const originalModulesDir = path.join(c.cwd, c.modulesDirectory);
    const { outputModulesDir } = c.pointFiles;
    traverseDir(originalModulesDir, f => {
      const wholePath = path.join(outputModulesDir, f.relativeFile)

      const obj = path.parse(wholePath);
      obj.ext = '.js';
      obj.base = obj.base.replace(/\.(t|j)s(x?)/, '.js')

      const outputJS = path.format(obj)

      expect(fs.existsSync(outputJS)).toBeTruthy()
    })
  })

  it('generate module types', async () => {
    const c = await readMockProjectConfig('hasModules')
    await generateModuleTypes(c)

    const dir = c.pointFiles.outputModulesDir
    const filesInDir = fs.readdirSync(dir).filter(f => f.endsWith('.d.ts'))
    expect(filesInDir.length).toBe(1)
    
    const dtsContent = fs.readFileSync(path.join(dir, filesInDir[0]), 'utf-8')
    expect(/declare const name: "AddSource";/.test(dtsContent)).toBeTruthy()
  })

  it('compile views', async () => {
    const c = await readMockProjectConfig('hasModules')
    await buildViews(c);

    const originalViewsDir = path.join(c.cwd, c.viewsDirectory);
    const { outputViewsDir } = c.pointFiles;
    traverseDir(originalViewsDir, f => {
      const wholePath = path.join(outputViewsDir, f.file)
      const obj = path.parse(wholePath);
      obj.ext = '.js';
      obj.base = obj.base.replace(/\.(t|j)s(x?)/, '.js')

      const outputJS = path.format(obj)

      const outputJSCode = fs.readFileSync(outputJS, 'utf-8')

      expect(fs.existsSync(outputJS)).toBeTruthy();
      expect(/from "@polymita\/renderer"/.test(outputJSCode)).toBeTruthy()
      expect(/from "@polymita\/signal-model"/.test(outputJSCode)).toBeTruthy()
      /** bundle polymita into output js */ 
      // expect(/from "polymita\/components\/modal"/.test(outputJSCode)).toBeTruthy()
      expect(/from "react"/.test(outputJSCode)).toBeTruthy()
    });
  })
})