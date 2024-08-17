import { Plugin } from '@polymita/signal-model'

export function createApiPlugin () {
  const plugin = new Plugin()

  const fetchAPI = (from: string, e: string, m: string, w: any) => {
    return fetch(`/api/prisma/${e}/${m}?from=${from}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(w),
    }).then(r => r.json())
  }

  async function find(from: string, e: string, w) {
    return fetchAPI(from, e, 'find', w)
  }
  async function update(from: string, e: string, w) {
    return fetchAPI(from, e, 'update', w)
  }
  async function remove(from: string, e: string, d) {
    return fetchAPI(from, e, 'delete', d)
  }
  async function create(from: string, e: string, q) {
    return fetchAPI(from, e, 'create', q)
  }
  async function updateMany(from, e: string, query) {
    return fetchAPI(from, e, 'updateMany', query)
  }
  async function upsert(from, e: string, query) {
    return fetchAPI(from, e, 'upsert', query)
  }

  plugin.loadPlugin('Model', {
    find, update, remove, create, updateMany, upsert,
    async executeDiff(){},
  })

  return plugin
}