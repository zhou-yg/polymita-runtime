import {
  ModelRunner, IDiff, IHookContext,
  IQueryWhere, debuggerLog,
  IModelData, setGlobalModelEvent, ModelEvent
} from '../../src/index'
import prisma, { clearAll } from '../prisma'
import * as mockBM from '../mockBM'

describe('client model', () => {
  beforeAll(() => {
    // make sure the model run in server envirnment
    mockBM.enterServer()
    clearAll()
  })
  beforeEach(async () => {

    setGlobalModelEvent(new ModelEvent())

    await prisma.item.deleteMany({})

    const mockUsersData = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]
    for (const data of mockUsersData) {
      await prisma.item.create({
        data
      })  
    }
    let times = 0;

    mockBM.initModelConfig({

      async find (from: string, e: 'item', w: IQueryWhere) {
        return prisma[e].findMany(w as any)
      },
      async create (from: string, e: 'item', d: Omit<IModelData<any>, 'where'>) {
        return prisma[e].create(d as any)
      },
      async executeDiff (from: string, entity: 'item', diff: IDiff) {
        await Promise.all(diff.create.map(async (obj) => {
          await prisma[entity].create({
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
      },
      async postComputeToServer(c: IHookContext) {

        const leave = mockBM.enterServer()
        const serverRunner = new ModelRunner(mockBM[c.name as keyof typeof mockBM])
        serverRunner.init(c.initialArgList as [any, any], c)
  
        if (c.index) {
          await serverRunner.callHook(c.index, c.args)
        }
        await serverRunner.ready()
        const context = serverRunner.scope.createPatchContext()
  
        leave()
  
        return context
      },
      async postQueryToServer(c: IHookContext): Promise<IHookContext> {
        const leave = mockBM.enterServer()

        times++
        if (times > 5) {
          throw new Error('max call')
        }

        const runner = new ModelRunner(mockBM[c.name as keyof typeof mockBM])
        runner.init(c.initialArgList as any, c)
        if (c.index !== undefined) {
          await runner.callHook(c.index, c.args)
        }
        await runner.ready()

        await mockBM.wait(100)
        const context = runner.scope.createPatchContext()

        leave()
        debuggerLog(false)

        return context
      }
    })
  })
  afterAll(() => {
    process.env.TARGET = ''
    setGlobalModelEvent(null)
  })
  describe('mount model', () => {
  
    it('post query to server', async () => {
      const leave = mockBM.enterClient()
      const runner = new ModelRunner(mockBM.userModelClient)
      const result = runner.init()  
      leave()

      await runner.ready()

      expect(result.users()).toEqual([
        { id: 1, name: 'a' },
      ])

      runner.scope.deactivate()
    })

    it('keep active model in realtime', async () => {

      const leave = mockBM.enterClient()

      const runner1 = new ModelRunner(mockBM.writeModelWithSource)
      const result1 = runner1.init()

      const runner2 = new ModelRunner(mockBM.writeModelWithSource)
      const result2 = runner2.init()

      leave()

      await Promise.all([
        runner1.ready(),
        runner2.ready()
      ])

      result1.name(() => 'c')
      await result1.createItem('')

      await Promise.all([
        runner1.ready(),
        runner2.ready()
      ])

      expect(result1.items()[2].name).toEqual('c')
      expect(result2.items()[2].name).toEqual('c')

      runner1.scope.deactivate()
      runner2.scope.deactivate()
    })
  })
  describe('update model', () => {
    it('query immediate with context still wont send query', async () => {
      mockBM.enterClient()
      const runner = new ModelRunner(mockBM.userModelClient)
      const cd: IHookContext['data'] = [
        ['num', 'data', 3, Date.now()],
        ['users', 'data', [{ id: 3, name: 'c' }], Date.now()]
      ]
      const context = mockBM.initContext({
        index: undefined,
        data: cd
      })
      // debuggerLog(true)
      const result = runner.init([], context)

      mockBM.enterServer()
    
      await runner.ready()

      expect(result.users()).toEqual([
        { id: 3, name: 'c' },
      ])
      expect(result.users._hook.modifiedTimestamp).toBe(cd[1][2]!)
      
      result.num(() => 1)

      await runner.ready()
      expect(result.users()).toEqual([
        { id: 1, name: 'a' },
      ])
      expect(result.users._hook.modifiedTimestamp).toBeGreaterThan(cd[1][2]!)
    })
  })
})