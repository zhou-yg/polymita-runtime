/**
 * run in electron runtime
 */
import { IConfig } from '../src/config';
import { setupClient } from './core';

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