'use server'
import { cookies } from 'next/headers'
 
import * as client from '@/models/customPrismaClient/client'
import { Plugin, getNamespace, IDiff, IHookContext, ModelRunner, startReactiveChain } from '@polymita/signal-model'
import { signalMap } from './signalsMap'
import modelIndexes from '@/models/indexes.json'

if (!client.PrismaClient) {
  throw new Error('[setPrisma] error, prisma.PrismaClient not found please run prisma generate first')
}
const prisma = new client.PrismaClient()
console.log('prisma.$connect: ', prisma.$connect);
const connectResult = prisma.$connect();
connectResult.then(() => {
  console.log('connect success', Object.keys(prisma))
})

async function find(from: string, e: string, w) {
  console.log('find e: ', e);
  return prisma[e].findMany(w).then(r => r)
}
async function update(from: string, e: string, w) {
  console.log('update start: ', e, w);
  const r = prisma[e].update(w)
  await r
  console.log('update end: ', e);
  return r
}
async function remove(from: string, e: string, d) {
  return prisma[e].delete(d).then(r => r)
}
async function create(from: string, e: string, q) {
  console.log('create start: ', e, q);
  const r = prisma[e].create(q).then(r => r)
  await r
  console.log(`create end:`,e, q)
  return r
}
async function updateMany(from, e: string, query) {
  return prisma[e].updateMany(query).then(r => r)
}
async function upsert(from, e: string, query) {
  return prisma[e].upsert(query).then(r => r)
}
// should check relation here
async function executeDiff(from: string, e: string, d: IDiff) {
  await Promise.all(d.create.map(async (obj) => {
    await prisma[e].create({
      data: obj.value
    })
  }))
  await Promise.all(d.update.map(async (obj) => {
    const { source } = obj
    if (source.id === undefined || source.id === null) {
      throw new Error('[update] must with a id')
    }
    await prisma[e].update({
      where: {
        id: source.id
      },
      data: obj.value
    })
  }))
  await Promise.all(d.remove.map(async obj => {
    const { source: string, value } = obj
    if (value.id === undefined || value.id === null) {
      throw new Error('[remove] must with a id')
    }
    await prisma[e].delete({
      where: {
        id: value.id
      }
    })
  }))
}

async function cookieSet(s, k, value) {
  if (typeof value === 'string'){
    cookies().set(k, value)
  }
}
async function cookieGet(s, k): Promise<any> {
  const v = cookies().get(k)
  return v
}
async function cookieClear(s, k) {
  return cookies().set(k, '')
}

function isComposedDriver (f: any) {
  return !!(f as any).__polymita_compose__
}

function createServerPlugin () {
  const plugin = new Plugin()

  plugin.loadPlugin('Model', {
    find,
    update,
    remove,
    create,
    updateMany,
    upsert,
    executeDiff,
  })
  plugin.loadPlugin('cookie', {
    set: cookieSet,
    get: cookieGet,
    clear: cookieClear,
  })

  return plugin
}


async function postComputeToServer(ctx: IHookContext) {
  const { name: signalName, initialArgList, index, args } = ctx
  const signalFunction = signalMap[signalName]
  

  const driverNamespace = getNamespace(signalFunction)
  const driverComposed = isComposedDriver(signalFunction);

  const currentModelIndexes = driverNamespace && driverComposed ? modelIndexes[driverNamespace] : modelIndexes

  let runner = new ModelRunner(signalFunction, {
    believeContext: false,
    modelIndexes: currentModelIndexes,
    runtime: 'nodejs',
    plugin: createServerPlugin(),
  })
  let scope = runner.prepareScope(initialArgList, ctx)

  const chain1 = startReactiveChain(`${signalName}(init)`)

  runner.executeDriver(scope)

  await scope.ready()

  chain1.stop()
  // chain1.print()
  
  if (index !== undefined) {
    const chain2 = startReactiveChain(`${signalName}:call(${index})`)
    await scope.callHook(index, args)
    await scope.ready()
    chain2.stop()
    // chain2.print()
  }
  const context = scope.createPatchContext()

  return context
}

const postQueryToServer = postComputeToServer.bind(this)

export {
  find,
  update,
  remove,
  create,
  updateMany,
  upsert,
  executeDiff,
  cookieSet,
  cookieGet,
  cookieClear,
  postComputeToServer,
  postQueryToServer,
}
