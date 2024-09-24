/**
 * keep same as next-server/src/config.ts#UserCustomConfig
 */
interface UserCustomConfig {
  platform: 'browser' | 'desktop'
  ts?: boolean
  debugLog?: boolean
}

export function getConfig (): UserCustomConfig {
  return globalThis.projectConfig || {};
}
