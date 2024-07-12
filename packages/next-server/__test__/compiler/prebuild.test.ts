import path from 'node:path'
import fs from 'node:fs'
import {
  buildModules, traverseDir,
} from '../../src'
import { readMockProjectConfig, resetMockProjectConfig } from '../mockUtil'

const testProject = 'ns-basic'

describe('compile module', () => {
  afterEach(() => {
    resetMockProjectConfig(testProject)
  })
  it('compile modules', async () => {
    const c = await readMockProjectConfig(testProject)

    await buildModules(c)
  })
})