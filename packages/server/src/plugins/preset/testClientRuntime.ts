import { clearPlugins, loadPlugin } from "@polymita/signal"
import { parseWithUndef, serializeJSON, stringifyWithUndef } from "./clientRuntime"
import fetch from 'node-fetch'

/**
 * runtime for "test" command
 */
export function testClientRuntime(options: {
  port: number
  host?: string // defaults to "localhost"
  disableChainLog?: boolean
}) {
  clearPlugins()

  const { host = 'localhost', port, disableChainLog } = options
  // @ts-ignore
  const hostConfig = `http://${host}:${port}/_hook`
  // @ts-ignore
  const diffPath = `http://${host}:${port}/_diff`
  
  loadPlugin('Model', {
    async find(e, w) {
      return []
    },
    async update(e, w) {
      return []
    },
    async remove(e, d) {
      return []
    },
    async create(e, d) {
      return {}
    },
    async executeDiff(d) {},
  })

  loadPlugin('Context', {
    async postDiffToServer(entity, diff) {
      await fetch(`${diffPath}`, {
        method: 'POST',
        body: stringifyWithUndef({
          entity,
          diff
        }),
        headers: {
          'disable-chain-log': String(disableChainLog)
        },
      })
    },
    async postComputeToServer(c) {
      // @ts-ignore
      const newContext = await fetch(`${hostConfig}/${c.name}`, {
        method: 'POST',
        body: serializeJSON(c),
        headers: {
          'disable-chain-log': String(disableChainLog)
        },
      })
        .then(r => r.text())
        .then(parseWithUndef)

      return newContext
    },
    async postQueryToServer(c) {
      const newContext = await fetch(`${hostConfig}/${c.name}`, {
        headers: {
          'disable-chain-log': String(disableChainLog)
        },
        method: 'POST',
        body: serializeJSON(c)
      })
        .then(r => r.text())
        .then(parseWithUndef)

      return newContext
    },
  })

  loadPlugin('Cache', {
    async getValue(k, f) {
      throw new Error('no config cache')
      return undefined
    },
    async setValue(k, v, f) {},
    clearValue(k, f) {}
  })
}