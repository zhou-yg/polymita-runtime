import {
  Runner,
  IHookContext, 
  CacheInitialSymbol
} from '../../src/index'

import * as mockBM from '../mockBM'

describe('cache', () => {

  describe('mount cache', () => {
    beforeEach(() => {
      mockBM.testPlugin.getPlugin('Cache').clearValue(null as any, '', 'cookie')
    })
  
    it('simple cache', async () => {
      const runner = mockBM.getRunnerWithPlugin(mockBM.onlyCache)
      const result = runner.init()
  
      await runner.ready()

      const cVal = result.c()
  
      expect(cVal).toBe(undefined)

      result.c({ num: 0 })
      const c2 = result.c()

      expect(c2).toEqual({ num: 0 })
    })
    it('update cache data', async () => {
      const runner = mockBM.getRunnerWithPlugin(mockBM.onlyCache)
      const result = runner.init()

      result.c(() => ({
        num: 1
      }))

      await runner.ready()

      const val = result.c()

      expect(val).toEqual({ num: 1 })
      
      const cookieVal = await mockBM.testPlugin.getPlugin('Cache').getValue(runner.scope, 'num', 'cookie')
      expect(cookieVal).toEqual({ num: 1 })
    })

    it('update cache in IC', async () => {
      const runner = mockBM.getRunnerWithPlugin(mockBM.cacheInIC)
      const result = runner.init()

      await result.changeC1(2)
      
      await runner.ready()

      expect(result.c()).toEqual({ num:2 })

      const cookieVal = await mockBM.testPlugin.getPlugin('Cache').getValue(runner.scope, 'num', 'cookie')
      expect(cookieVal).toEqual({ num: 2 })
    })

    it('cache with source', async () => {
      const runner = mockBM.getRunnerWithPlugin(mockBM.cacheWithSource)
      const initialVal = { num: 0 }
      const result = runner.init([initialVal])
  
      const cVal = result.c()
      
      expect(cVal).toEqual(initialVal)
      
      result.s(d => {
        d.num = 1
      })

      expect(result.c._hook._internalValue).toBe(CacheInitialSymbol)
  
      await runner.ready()

      const cVal2 = result.c()

      expect(cVal2).toEqual({ num: 1 })
    })
  })
  
  describe('update cache', () => {
    beforeEach(() => {
      mockBM.testPlugin.getPlugin('Cache').clearValue(null as any, '', 'cookie')
    })
    it('initialize simple cache with context', async () => {
      const runner = mockBM.getRunnerWithPlugin(mockBM.onlyCache)
      const cd: IHookContext['data'] = [
        ['c', 'data', 2, Date.now()],
      ]
      const context = mockBM.initContext({
        index: 0,
        data: cd,
      })
      const result = runner.init([], context)
  
      await runner.ready()

      const cVal = result.c()
  
      expect(cVal).toBe(2)
      expect(result.c._hook.modifiedTimestamp).toBe(cd[0][3])
    })
  })
})
