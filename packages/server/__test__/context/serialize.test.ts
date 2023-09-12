import { UNDEF_TAG, parseWithUndef, stringifyWithUndef } from '../../src/plugins/preset'
import {
  startTestServer
} from '../mockUtil'

describe('serialize', () => {
  let app
  beforeAll(async () => {
    // app = await startTestServer()
  })
  afterAll(() => {
    // app!.close()
  })

  it('send to server', async () => {
    
  })

  describe('JSON including undef', () => {
    it('stringify', () => {
      const r = stringifyWithUndef({ a: undefined })
      expect(r).toBe(`{"a":"${UNDEF_TAG}"}`)
    })
    it('parse', () => {
      const r = parseWithUndef(`{"a": "${UNDEF_TAG}" }`)
      expect(r).toEqual({ a: undefined })
    })
  })
})