/**
 * run in electron runtime
 */
import electron from 'electron'
import { IConfig } from '../src/config';
import { connectModel, getDefaultRoute } from '../src/util';

const { app, BrowserWindow } = electron
console.log('electron: ', electron);

function createWindow (winOptions: {
  site: string
}) {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  })
  mainWindow.loadURL(winOptions.site)
}

export function setupClient (c: Partial<IConfig>) {

  const client = connectModel()

  const defaultView = c.pages ? getDefaultRoute(c.pages) : 'main'

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