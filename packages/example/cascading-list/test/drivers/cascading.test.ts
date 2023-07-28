import { ModelRunner } from '@polymita/signal-model'
import clientDriver from '../../.test/client/drivers/cjs/cascading'
import serverDriver from '../../.test/server/drivers/cjs/cascading'

describe('test driver/cascading', () => {
  describe('client', () => {
    it('init runner', () => {
      const runner = new ModelRunner(clientDriver)
      const result = runner.init()
      console.log('result: ', result);

      expect(Object.keys(result).length).toBeGreaterThan(0)
    })
  })
  describe('server', () => {

  })
})