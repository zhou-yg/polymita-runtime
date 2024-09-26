/**
 * keep same as next-server/src/config.ts#UserCustomConfig
 */
interface UserCustomConfig {
  platform: 'browser' | 'desktop'
  ts?: boolean
  debugLog?: boolean

  moduleOverride?: {
    activeLink?: string[]
    linkMap?: Map<string, string[]>
    configMap?: Record<string, Record<string, any>>
  }
}

export function getConfig (): UserCustomConfig {
  if (!globalThis.POLYMITA_CONFIG) {
    globalThis.POLYMITA_CONFIG = {
      moduleOverride: {
        linkMap: new Map<string, string[]>(),
        activeLink: []
      }
    }
  }
  return globalThis.POLYMITA_CONFIG;
}

export function createModulesContext (
  config: UserCustomConfig,
  initialContext: Record<string, any>
) {
  let context = initialContext;
  if (!context) {
    context = globalThis.POLYMITA_MODULES || {};
  }

  function registerModule ( 
    pkg: string,
    exports: {
      views: Record<string, any>,
      modules: Record<string, any>,
      overrides: Record<string, any>,
    }
  ) {
    context = {
      ...context || {},
      [pkg]: exports,
    }
    
    Object.values(exports.overrides || {}).forEach(viewFn => {
      viewFn(config.moduleOverride.linkMap);
    })

  }
  
  function getModules () {
    return context
  }
  
  function getModule (pkg: string, name: string) {
    const modules = getModules()
    const module = modules[pkg]
    if (!module) {
      throw new Error(`[next-connect] Module ${pkg} not found`)
    }
    return module[name]
  }

  return {
    registerModule,
    getModule,  
    getModules,
  }
}

