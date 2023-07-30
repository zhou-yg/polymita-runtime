import { ModelRunner } from '@polymita/signal-model'
import { clientTestingRuntime } from '@polymita/server/dist/test-preset'
import clientDriver from '../../.test/client/drivers/cjs/cascading'
import serverDriver from '../../.test/server/drivers/cjs/cascading'

describe('test driver/cascading', () => {
  describe('client', () => {
    beforeAll(() => {
      clientTestingRuntime({ port: 10088 })
    })

    it('init runner', async () => {
      const runner = new ModelRunner(clientDriver)
      const result = runner.init()
      console.log('result: ', Object.keys(result));

      expect(Object.keys(result).length).toBeGreaterThan(0)

      const folders = result.folders()
      console.log('folders: ', folders);
      await runner.ready()
      const folders2 = result.folders()
      console.log('folders2: ', folders2);
    })
  })
  describe('server', () => {

  })
})