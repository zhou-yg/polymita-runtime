import { getPlugin, IRunningContext, loadPlugin } from '@polymita/signal-model'

export function setCookies () {

  loadPlugin('cookie', {
    async set(s, k, value) {
      // console.trace('[setCookies.set]: ', k, value);
      // console.log('[setCookies.set]: ', getPlugin('GlobalRunning').getCurrent(s), !!s);
      if (typeof value === 'string'){
        getPlugin('GlobalRunning').getCurrent(s)?.cookies.set(k, value)
      }
    },
    async get(s, k): Promise<any> {
      const v = getPlugin('GlobalRunning').getCurrent(s)?.cookies.get(k)
      // console.trace('[setCookies.get] s, k: ', k, v);
      // console.log('[setCookies.get] s, k: ', getPlugin('GlobalRunning').getCurrent(s));
      return v
    },
    clear(s, k) {
      getPlugin('GlobalRunning').getCurrent(s)?.cookies.set(k, '')
    },
  })
}