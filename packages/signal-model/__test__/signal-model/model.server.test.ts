import {
  ModelRunner, debuggerLog, IDiff, IHookContext, IQueryWhere,
  startdReactiveChain, stopReactiveChain, State, Model,
  Computed
} from '../../src/index'

import * as mockBM from '../mockBM'
import prisma, { clearAll } from '../prisma'

const plugin = mockBM.initModelConfig({
  async find (from: string, e: 'item', w: IQueryWhere) {
    return prisma[e].findMany(w as any)
  },
  async create (from: string, e: 'item', w: IQueryWhere) {
    return prisma[e].create(w as any)
  },
  async update (from: string, e: 'item', w: IQueryWhere) {
    return prisma[e].update(w as any)
  },
  async updateMany (from: string, e: 'item', w: IQueryWhere) {
    return prisma[e].updateMany(w as any)
  },
  async upsert (from: string, e: 'item', w: IQueryWhere) {
    return prisma[e].upsert(w as any)
  },
  async remove (from: string, e: 'item', w: IQueryWhere) {
    return prisma[e].delete(w as any)
  },
  async executeDiff (from: string, entity: 'item', diff: IDiff) {
    await Promise.all(diff.create.map(async (obj) => {
      const r = await prisma[entity].create({
        data: obj.value as any
      })
    }))
    await Promise.all(diff.update.map(async (obj) => {
      await prisma[entity].update({
        where: { id: obj.source.id },
        data: obj.value
      })
    }))
    await Promise.all(diff.remove.map(async (obj) => {
      await prisma[entity].delete({
        where: { id: obj.value.id },
      })
    }))
  }
})


describe('model', () => {
  beforeAll(() => {
    // make sure the model run in server envirnment
    process.env.TARGET = 'server'
    clearAll()
  })
  afterAll(() => {
    process.env.TARGET = ''
  })
  beforeEach(async () => {
    await prisma.item.deleteMany({})
    await prisma.sub_package_Item.deleteMany({})
    // check delete result
    const r = await prisma.item.findMany({})
    if (r.length > 0) {
      await prisma.item.deleteMany({})
      await prisma.sub_package_Item.deleteMany({})

      const r2 = await prisma.item.findMany({})
      if (r2.length > 0) {
        throw new Error('prisma.item.deleteMany fail')
      }
    }

    const mockUsersData = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]
    for (const data of mockUsersData) {
      await prisma.item.create({
        data
      })  
      await prisma.sub_package_Item.create({
        data: { ...data, name: `sub-${data.name}` }
      })  
    }
  })
  describe('mount model', () => {
  
    it('upsert', async () => {
      const runner = new ModelRunner(mockBM.useUpsertManyModel, { plugin })
      const result = runner.init()

      await runner.ready();
      expect(result.users()).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]);
      const newName = 'ccc';
      const newId = 3;
      const p = result.updateName(newId, newName);
      expect(runner.state()).toBe('idle');
      await p;
      expect(runner.state()).toBe('idle');

      expect(result.users()[2].name).toEqual(newName);

      const newName3 = 'eee';
      const p3 = result.updateName(1, newName3);
      expect(runner.state()).toBe('idle');
      await p3;
      expect(runner.state()).toBe('idle');

      expect(result.users()[0].name).toEqual(newName3);
    })
    it('update many', async () => {
      const runner = new ModelRunner(mockBM.useUpdateManyModel, { plugin })
      const result = runner.init()

      await runner.ready();
      expect(result.users()).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]);
      const newName = 'ccc';
      const p = result.updateName([1,2], newName);
      expect(runner.state()).toBe('idle');
      await p;
      expect(runner.state()).toBe('idle');

      expect(result.users()).toEqual([
        { id: 1, name: newName },
        { id: 2, name: newName },
      ]);
    })

    it('find immediate', async () => {
      const runner = new ModelRunner(mockBM.userPessimisticModel, { plugin });
      const result = runner.init()
      
      expect(runner.state()).toBe('pending')

      await runner.ready()

      expect(runner.state()).toBe('idle')

      expect(result.users()).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ])
    })
    it('find with injectModel', async () => {
      const runner = new ModelRunner(mockBM.userInjectFindModel, { plugin })
      const result = runner.init()
      
      expect(runner.state()).toBe('pending')

      await runner.ready()

      expect(runner.state()).toBe('idle')

      expect(result.users()).toEqual([
        { id: 2, name: 'b' },
      ])
    })
  
    it('check exist before create', async () => {
      const runner = new ModelRunner(mockBM.userModelInputeCompute, { plugin })
      const result = runner.init()
      
      result.createItem(3, 'a')
      await runner.ready()
      expect(await result.items()).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ])
  
      await result.createItem(3, 'c')
      await runner.ready()
  
      const r2 = await result.items()
  
      expect(r2).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ])
    })
  
    it('query where computed', async () => {
      const runner = new ModelRunner(mockBM.userModelComputedQuery, { plugin })
      const result = runner.init()
      await runner.ready()
      expect(result.users()).toEqual([])
  
      result.targetName(() => 'a')
      await runner.ready()
      expect(result.users()).toEqual([{ id: 1, name: 'a' }])
  
      result.targetName(() => 'b')
      await runner.ready()
      expect(result.users()).toEqual([{ id: 2, name: 'b' }])
    })

    it('model used in computed (with chain) ', async () => {
      const runner = new ModelRunner(mockBM.modelInComputed, { plugin })

      const initChain = startdReactiveChain()

      const result = runner.init()

      expect(runner.state()).toBe('idle')

      expect(result.usersProgress().state).toBe('init')

      stopReactiveChain()

      // @TODO
      // const firstComputed = initChain.children[0]
      // expect(firstComputed.hook).toBeInstanceOf(Computed)
      // expect(firstComputed.children[0].hook).toBeInstanceOf(Model)
      // expect(firstComputed.children[0].type).toBe('call')
      // expect(firstComputed.children[0].children[0].hook).toBeInstanceOf(Computed)
      // expect(firstComputed.children[0].children[0].children[0].hook).toBeInstanceOf(State)
      // expect(firstComputed.children[0].children[0].children[0].type).toBe('call')
      // expect(firstComputed.children[0].children[0].children[1].hook).toBeInstanceOf(Model)


      expect(result.userNames()).toEqual([])

      const chain = startdReactiveChain()

      result.targetName(() => 'a')

      stopReactiveChain()
      
      await runner.ready()

      expect(chain.children[0].oldValue).toBe('')
      expect(chain.children[0].newValue).toBe('a')
      expect(chain.children[0].hook).toBeInstanceOf(State)
      expect(chain.children[0].children[0].hook).toBeInstanceOf(Computed)
      expect(chain.children[0].children[0].children[0].hook).toBeInstanceOf(State)
      expect(chain.children[0].children[0].children[1].hook).toBeInstanceOf(Model)
      expect(chain.children[0].children[0].children[1].children[0].hook).toBeInstanceOf(Computed)

      expect(result.users()).toEqual([
        { id: 1, name: 'a' },
      ])
      expect(result.userNames()).toEqual(['a'])
    })
  
    describe('modify (default=server) ', () => {
      it('object:update property', async () => {
        const runner = new ModelRunner(mockBM.userPessimisticModel, { plugin })
        const result = runner.init()
        
        const newName = 'updated a'
  
        await runner.ready()

        result.users((draft: any) => {
          draft[0].name = newName
        })

        await runner.ready()

        const users = result.users()

        expect(users).toEqual([
          { id: 1, name: newName },
          { id: 2, name: 'b' },  
        ])
      })
      it('object:create child', async () => {
        const runner = new ModelRunner(mockBM.userPessimisticModel, { plugin })
        const result = runner.init()
        
  
        // @TODO: 增加relation的关联CRUD
        // const childObj = { name: 'child' }
        // await result.users((draft: any) => {
        //   draft[1].child = childObj
        // })
        // const users = await result.users()
        // expect(users).toEqual([
        //   { id: 1, name: 'a' },
        //   { id: 2, name: 'b', childObj: { ...childObj, id: 1 } },
        // ])
      })
      it('object:remove property', async () => {
        const runner = new ModelRunner(mockBM.userPessimisticModel, { plugin })
        const result = runner.init()
  
        await runner.ready()

        result.users((draft: any) => {
          delete draft[1].name
        })
  
        await runner.ready()

        expect(result.users()).toEqual([
          { id: 1, name: 'a' },  
          { id: 2, name: null },  
        ])
      })
      it('array:create new element', async () => {
        const runner = new ModelRunner(mockBM.userPessimisticModel, { plugin })
        const result = runner.init()
          
        const newObj = { name: 'c', id: 3 }
  
        result.users((draft: any) => {
          draft.push(newObj)
        })
        await runner.ready()

        const users = result.users()
  
        expect(users).toEqual([
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
          newObj
        ])
      })
      it('array:remove element', async () => {
        const runner = new ModelRunner(mockBM.userPessimisticModel, { plugin })
        const result = runner.init()

        await runner.ready()

        result.users((draft: any) => {
          draft.splice(0, 1)
        })

        await runner.ready()
  
        expect(result.users()).toEqual([
          { id: 2, name: 'b' },  
        ])
      })
    })
  })
  describe('update model', () => {
    it('find immediate', async () => {
      const runner = new ModelRunner(mockBM.userPessimisticModel, { plugin })
      const cd: IHookContext['data'] = [
        ['users', 'data', { id: 1, name: 'a' }, Date.now()],
      ]
      const context = mockBM.initContext({
        index: undefined,
        data: cd
      })
      const result = runner.init([], context)
      
      await runner.ready()

      expect(result.users()).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ])
    })
  })

  describe('dependent models', () => {
    it('apply compute patches sequence', async () => {
      const runner = new ModelRunner(mockBM.multiPatchesInputCompute, { plugin })
      const result = runner.init()
      
      await runner.scope.ready()

      expect(result.item()).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ])

      await result.ic()
  
      expect(result.item()).toEqual([
        { id: 1, name: 'updated' },
        { id: 2, name: 'b' },
        { id: 3, name: '1'}
      ])
    })  
  })

  describe('dynamic model indexes', () => {
    it('compose sub package driver', async () => {
      const runner = new ModelRunner(mockBM.composeDriverWithNamespace, {
        believeContext: true,
        modelIndexes: {
          item: 'item',
          'sub/package': {
            item: 'sub_package_Item'
          }
        },
        plugin
      })
      const result = runner.init()
      
      await runner.scope.ready()    

      expect(result.m1()).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ])
      expect(result.cm1()).toEqual([
        { id: 1, name: 'sub-a' },
        { id: 2, name: 'sub-b' },
      ])
    })
  })

  // writing here temporarily
  describe('write model', () => {
    it('inject write model', async () => {  
      const runner = new ModelRunner(mockBM.writeWritePrisma, { plugin })
      const result = runner.init()
      
      await runner.scope.ready()
      expect(result.itemsLength()).toBe(2)
  
      await result.ic()
  
      expect(result.itemsLength()).toBe(3)
      expect(result.p1()).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 10, name: 'aa'}
      ])
    })
    it('connectModel', async () => {
      const runner = new ModelRunner(mockBM.writeModelWithSource, { plugin })
      const result = runner.init()

      await runner.ready()

      result.name(() => 'c')
      await result.createItem('')

      await runner.scope.ready()

      expect(result.items()[2].name).toEqual('c')

      await result.createItem('ddd')
      await runner.scope.ready()

      expect(result.items()[3].name).toEqual('ddd')
    })

    it('write model by quick command',async () => {
      const runner = new ModelRunner(mockBM.writeModelByQuickCommand, { plugin })
      const result = runner.init()
      
      await runner.ready()
  
      result.name(() => 'c')
      await result.createItem()

      expect(result.items().length).toEqual(3)
      expect(result.items()[2].name).toEqual('cc')

      const id = result.items()[2].id
      result.name(() => 'ccc')
      await result.updateItem(id)

      expect(result.items()[2].name).toEqual('ccc')

      await result.removeItem(id)
      expect(result.items().length).toEqual(2)
    })
  })
})