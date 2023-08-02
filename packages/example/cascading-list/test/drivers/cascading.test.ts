import * as sm from '@polymita/signal-model'
import * as clientSm from '@polymita/signal-model/dist/signal-model.client'
import { clientTestingRuntime } from '@polymita/server/dist/test-preset'
import clientDriver from '../../.test/client/drivers/cjs/cascading'
import serverDriver from '../../.test/server/drivers/cjs/cascading'

describe('test driver/cascading', () => {
  describe('client', () => {
    beforeAll(() => {
      console.log('process.env.TEST_SERVER_PORT: ', process.env.TEST_SERVER_PORT);
      clientTestingRuntime({ port: process.env.TEST_SERVER_PORT })
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

  })
})