import { ModelRunner } from '@polymita/signal-model'
import { clientTestingRuntime } from '@polymita/server/dist/test-preset'
import clientDriver from '../../.test/client/drivers/cjs/cascading'
import serverDriver from '../../.test/server/drivers/cjs/cascading'

describe('test driver/cascading', () => {
  describe('client', () => {
    beforeAll(() => {
      clientTestingRuntime({ port: 10088 })
    })

    it('init runner', () => {
      const runner = new ModelRunner(clientDriver)
      const result = runner.init()
      console.log('result: ', Object.keys(result));

      expect(Object.keys(result).length).toBeGreaterThan(0)
    })
  })
  describe('server', () => {

  })
})