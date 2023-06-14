/**
 * run in electron runtime
 */
import electron from 'electron'
import { IConfig } from '../src/config';
import { connectModel, getDefaultRoute } from '../src/util';

const { app, BrowserWindow } = electron

function createWindow (winOptions: {
  site: string
}) {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  })
  mainWindow.loadURL(winOptions.site)
}

function setupClient (c: IConfig) {

  const client = connectModel()

  const defaultView = getDefaultRoute(c.pages)

  const winOption = {
    site: `http://localhost:${c.port}/${defaultView}`
  }

  client.use(async (ctx, next) => {
    await app.whenReady()

    createWindow(winOption)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(winOption)
      }
    })
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })
    await next()
  })


  return client
}

export function createClient (c: IConfig) {
  
}

export async function createDevClient (c: IConfig) {
  const client = setupClient(c)
  client.start()
}

function start (c: IConfig) {
  const isDev = process.env.RUN_MODE === 'development'
  console.log('isDev: ', isDev);
  if (isDev) {
    createDevClient(c)
  } else {
  }  
}


type ProcessPayload = 
  | { type: 'config', data: IConfig }


let data = ''
process.stdin.on('data', (d) => {
  data += d
  console.error('[receive data]:', d.length)
})
process.stdin.on('end', () => {
  const receiveData = data
  data = ''
  try {
    const payload: ProcessPayload = JSON.parse(receiveData)
    console.log('[receive payload]: ', payload.type);

    switch (payload.type) {
      case 'config':
        start(payload.data)
        break
    }
  } catch (e) {
    console.error('[receive data error]:', e)
  }
})