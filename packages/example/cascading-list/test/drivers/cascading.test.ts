import * as sm from '@polymita/signal-model'
import * as clientSm from '@polymita/signal-model/dist/signal-model.client'
import { preset } from '@polymita/server/dist/preset'
import clientDriver from '../../.test/client/drivers/cjs/cascading'
import serverDriver from '../../.test/server/drivers/cjs/cascading'
import path from 'node:path'

describe('test driver/cascading', () => {
  describe('client', () => {
    beforeAll(() => {
      console.log('process.env.TEST_SERVER_PORT: ', process.env.TEST_SERVER_PORT);
      preset.testClientRuntime({ 
        port: process.env.TEST_SERVER_PORT || 9100,
        disableChainLog: true,
      })
    })

    it('init runner', async () => {
      const runner = new clientSm.ModelRunner(clientDriver)
      const result = runner.init()

      expect(Object.keys(result).length).toBeGreaterThan(0)

      const folders = result.folders()
      expect(folders.length).toBe(0)

      const folderByTest = 'folderByUnitTest'
      result.folderName(() => folderByTest)

      await result.createFolder()
      
      result.folders()
      await runner.ready()
      const folders2 = result.folders()

      const newCreated = (folders2.find(f => f.name === folderByTest))
      expect(newCreated).toBeTruthy()

      await result.removeFolder(newCreated)
    })
  })
  describe('server', () => {
    beforeAll(async () => {
      await preset.testServerRuntime({
        schemaFile: path.join(__dirname, '../../models/schema.prisma')
      })
    })
    it('server', async () => {
      // console.log('')
      const runner = new sm.ModelRunner(serverDriver)
      const result = runner.init()
      await runner.ready()
      const folders = result.folders()

      expect(folders.length).toBeGreaterThan(0)
      const lastFolder = folders[folders.length - 1]

      result.currentFolderId(lastFolder.id)
      expect(result.currentFolderId()).toBe(lastFolder.id)

      const newServerItemName = 'newServerItemName' + Date.now();
      result.itemName(newServerItemName)
      const r = await result.createItem()

      const items = result.items()
  
      const newInsert = items.find(i => i.name === newServerItemName)
      expect(newInsert).toBeTruthy()

      await result.removeItem(newInsert)
      const newItems = result.items()
      expect(newItems.length).toBe(items.length - 1)
    })
  })
})