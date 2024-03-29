import {
  get,
  set,
} from '../../src/index'
import { produceWithPatches, enablePatches } from 'immer'

enablePatches()

describe('util', () => {
  describe('set/get', () => {
    it('set and get', () => {
      const obj = { a: [0, 1] }
      set(obj, ['a', '1'], 33)

      expect(obj.a[1]).toBe(33)

      const v = get(obj, ['a', 1])
      expect(v).toBe(33)
    })
    it ('get with empty path', () => {
      const a = { a: 1 }

      const v = get(a, undefined)
      expect(v).toEqual(a)

      const v2 = get(a, [])
      expect(v2).toEqual(a)
    })
    it('set empty obj', () => {
      const obj: any = {}
      set(obj, ['k1', 0, 'k2'], 'val3')

      expect(obj.k1[0].k2).toBe('val3')
      expect(obj.k1).toBeInstanceOf(Array)
    })
  })
})
