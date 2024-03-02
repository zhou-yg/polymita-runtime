import { Runner, Computed } from '../../src/index'
import * as mockBM from '../mockBM'

describe('compose', () => {

  it('compose one', () => {

    const runner = mockBM.getRunnerWithPlugin(mockBM.composeWithSS)
    runner.init()

    const { hooks, composes, initialContextNames } = runner.scope

    expect(hooks.length).toBe(4)
    expect(composes.length).toBe(1)

    expect(hooks[0].name).toBe('s1')
    expect(hooks[1].name).toBe('compose.0.simpleSS.s1')
    expect(hooks[2].name).toBe('compose.0.simpleSS.s2')
    expect(hooks[3].name).toBe('s2')

    expect(hooks[0]?.watchers.has((hooks[3] as Computed<any>).watcher)).toBeTruthy()
    expect(hooks[0]?.watchers.size).toBe(2)
    expect(hooks[1]?.watchers.has((hooks[2] as Computed<any>).watcher)).toBeTruthy()
    expect(hooks[1]?.watchers.size).toBe(2)


    initialContextNames?.forEach(arr => {
      expect(hooks[arr[0]].name).toBe(arr[1])
    })
  })

  it('compose multi same hooks', () => {
    const runner = mockBM.getRunnerWithPlugin(mockBM.composeWithSS2)
    runner.init()

    const { hooks, composes, initialContextNames } = runner.scope

    expect(hooks.length).toBe(7)
    expect(composes.length).toBe(2)
    
    expect(hooks[0]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()
    expect(hooks[1]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()
    expect(hooks[5]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()

    initialContextNames?.forEach(arr => {
      expect(hooks[arr[0]].name).toBe(arr[1])
    })
  })
  it('compose deeply driver greater than 2', () => {
    const runner = mockBM.getRunnerWithPlugin(mockBM.composeDeeplyThan2)
    runner.init()

    expect(runner.scope.composes.length).toBe(4)

    // console.log('runner.scope.initialContextDeps: ', runner.scope.initialContextDeps);

    const rootDeps = runner.scope.initialContextDeps.slice(0, 1)

    expect(rootDeps[0][2][0][0]).toBe('c')
    expect(rootDeps[0][2][0][1]).toBe(3)

    const composeSS2Deps = runner.scope.initialContextDeps.slice(2, 4)

    expect(composeSS2Deps[1][2][1][1]).toBe(1)
    expect(composeSS2Deps[1][2][2][1]).toBe(2)
  })


  describe('update', () => {
    it('with nested compose deps', () => {

      const context = mockBM.initContext({
        index: -1
      })
      const runner = mockBM.getRunnerWithPlugin(mockBM.composeWithSS2)
      runner.init([], context)

      const { hooks, composes, initialContextNames } = runner.scope

      expect(hooks.length).toBe(7)
      expect(composes.length).toBe(2)
      
      expect(hooks[0]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()
      expect(hooks[1]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()
      expect(hooks[5]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()

      initialContextNames?.forEach(arr => {
        expect(hooks[arr[0]].name).toBe(arr[1])
      })    
    })
  })
})