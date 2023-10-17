import {
  Runner,
  getPlugin,
  IHookContext, 
  CacheInitialSymbol
} from '../../src/index'

import * as mockBM from '../mockBM'


describe('scope', () => {

  it ('mount only trigger onMount', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();

    const runner = new Runner(mockBM.mountAndUpdate);
    runner.init([{
      onMountCallback: fn1,
      onUpdateCallback: fn2
    }]);

    expect(fn1).toBeCalledTimes(1)
    expect(fn2).toBeCalledTimes(0);
  })

  it ('update only trigger onUpdate', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();

    const mockContext = mockBM.initContext({
      name: 'mock',
      data: [],
      index: 0,
    });

    mockContext.initialArgList = [
      {
        onMountCallback: fn1,
        onUpdateCallback: fn2
      }  
    ]

    const runner = new Runner(mockBM.mountAndUpdate);
    runner.init([{}], mockContext);

    expect(fn1).toBeCalledTimes(0)
    expect(fn2).toBeCalledTimes(1);
  })
})