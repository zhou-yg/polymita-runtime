import * as fs from 'fs'
import * as path from 'path'
import * as prismaInternals from '@prisma/internals'
import { composeSchema, readCurrentPrisma, readExistingPrismaPart, transformModelName } from '../compose';
import shelljs from 'shelljs'

const { cp } = shelljs;

import { IConfig } from "../../config"
import { loadJSON, lowerFirst, runSpawn, traverse, tryMkdir } from '../../util'
import { cloneDeep, merge, set, upperFirst } from 'lodash';
import { spawn } from 'child_process';

interface IModelIndexesBase {
  [k: string]: string | IModelIndexesBase
}

function findDependentIndexes (c: IConfig) {
  const schemaFiles: Array<{
    moduleName: string
    pkgName: string
    indexes: IModelIndexesBase
  }> = []

  ;c.allDependencyModules.forEach(({ dir, name, pkgName }) => {

    const depSchemaPath = path.join(dir, c.buildDirectory, c.modelsDirectory, c.schemaIndexes)
    const r2 = fs.existsSync(depSchemaPath)

    if (r2) {
      schemaFiles.push({
        moduleName: name,
        pkgName,
        indexes: JSON.parse(fs.readFileSync(depSchemaPath).toString())
      })
    }
  })

  return schemaFiles
}

function deepInsertName (moduleName: string, indexes: IModelIndexesBase) {
  const dependentIndexesWithNamespace: IModelIndexesBase = {}
  traverse(indexes, (keys, val: string | IModelIndexesBase) => {
    if (typeof val === 'string') {
      set(dependentIndexesWithNamespace, keys, transformModelName(`${moduleName}_${upperFirst(val)}`))
    } else {
      set(dependentIndexesWithNamespace, keys, deepInsertName(moduleName, val))
    }
  })
  return dependentIndexesWithNamespace
}

export async function generateModelTypes2(c: IConfig) {
  if (c.model.engine !== 'prisma') {
    return
  }
  const schemaIndexes = loadJSON(c.pointFiles.currentFiles.modelFiles.schemaIndexes);
  
  if (Object.values(schemaIndexes).length <= 0) {
    return;
  }

  const model = await prismaInternals.getGenerator({
    schemaPath: c.pointFiles.currentFiles.modelFiles.schemaPrisma,
    dataProxy: false,
  })
  const clientOutput = model.config?.output?.value;
  model.stop()

  if (!clientOutput) {
    return;
  }
  const prismaTypesFile = path.join(clientOutput, 'index.d.ts')

  if (!fs.existsSync(prismaTypesFile)) {
    return;
  }

  const result: string[] = []

  traverse(schemaIndexes, (keys, val: string | IModelIndexesBase) => {
    if (
      keys[keys.length -1] !== MODEL_INDEXES_NAMESPACE_KEY &&
      typeof val === 'string'
    ) {
      const interfaceName = upperFirst(val)
       result.push(interfaceName)
    }
  })

  if (!result.length) {
    return
  }
  const dts = `export {
  ${result.join(',\n  ')} 
} from '${path.join(clientOutput, 'index')}'`

  fs.writeFileSync(c.pointFiles.currentFiles.modelFiles.schemaIndexesTypes, dts)
}

export const MODEL_INDEXES_NAMESPACE_KEY = 'namespace'

export async function buildModelIndexes(c: IConfig) {
  if (c.model.engine === 'prisma') {

    if (fs.existsSync(c.pointFiles.currentFiles.modelFiles.modelDir)) {

      const dependentIndexes = findDependentIndexes(c)
  
      let existPrismaPart = readExistingPrismaPart(c)
  
      if (existPrismaPart.length <= 0) {
        const current = readCurrentPrisma(c);
        if (current.content) {
          existPrismaPart = [current]
        }
      }
  
      const schemaIndexesFile = c.pointFiles.currentFiles.modelFiles.schemaIndexes
  
      const objArr = await Promise.all(existPrismaPart.map(async ({ content }) => {
        const model = await prismaInternals.getDMMF({
          datamodel: content
        })
        const models = model.datamodel.models
        const r: Record<string, string | Record<string, string>> = {}
        models.forEach(m => {
          r[lowerFirst(m.name)] = lowerFirst(m.name)
        })
        return r
      }))
      const mergedObj: IModelIndexesBase = objArr.reduce((p, n) => Object.assign(p, n), {})
  
      dependentIndexes.forEach(obj => {
        const dependentIndexesWithNamespace = deepInsertName(obj.pkgName, obj.indexes)
  
        mergedObj[obj.pkgName] = {
          [MODEL_INDEXES_NAMESPACE_KEY]: obj.pkgName,
          ...dependentIndexesWithNamespace,
        }
      })

      mergedObj[MODEL_INDEXES_NAMESPACE_KEY] = c.packageJSON.name || ''
      /**
       * eg
       * mergedObj = {
       *   modelA: string
       *   anyModule: {
       *     modelA: `anyModule`_modelA
       *   }
       * }
       */
      fs.writeFileSync(schemaIndexesFile, JSON.stringify(mergedObj, null, 2))
    }
  }
}

export function runPrismaDev (c: IConfig) {
  return new Promise<void>((resolve, reject) => {
    const ps = spawn('npm', ['run', 'p:dev'], {
      stdio: 'inherit',
      cwd: c.cwd,
    });

    ps.on('close', () => {
      resolve();
    });
    ps.on('error', (e) => {
      reject(e)
    })
  })
}

export async function preCheckSchema(c: IConfig) {
  const schemaFile = path.join(c.cwd, c.modelsDirectory, c.targetSchemaPrisma)
  if (fs.existsSync(schemaFile)) {
    const schemaContent = fs.readFileSync(schemaFile, 'utf-8');
    // const model = await prismaInternals.getDMMF({
    //   datamodel: schemaContent
    // })
    // const gen = await prismaInternals.getGenerator({
    //   schemaPath: schemaFile,
    //   dataProxy: false
    // })
  
    const config = await prismaInternals.getConfig({
      datamodel: schemaContent
    })
    const file = config.datasources[0].url.value;
    const relativeDbPath = file?.replace('file:', '')
    if (relativeDbPath) {
      const dbPath = path.join(c.cwd, c.modelsDirectory, relativeDbPath)
      const dbExists = fs.existsSync(dbPath)
      if (!dbExists) {
        console.log(`[preCheckSchema] error, db file not found: ${dbPath}`)
        await runPrismaDev(c)
      }
    }
    
    tryGenerateClient(c)
  }
}

export async function tryGenerateClient(c: IConfig) {
  if (
    fs.existsSync(c.pointFiles.currentFiles.modelFiles.schemaPrisma) && 
    !fs.existsSync(c.pointFiles.currentFiles.modelFiles.customPrismaClientIndex)
  ) {
    await runSpawn(['prisma', 'generate'], { cwd: c.cwd })
  }
}

export function copyModelFiles (config: IConfig) {

  const { schemaPrisma, schemaIndexes } = config.pointFiles.currentFiles.modelFiles

  tryMkdir(config.pointFiles.output.modelsDir)

  if (fs.existsSync(schemaPrisma)) {
    cp(schemaPrisma, config.pointFiles.output.schemaPrisma)
  }
  if (fs.existsSync(schemaIndexes)) {
    cp(schemaIndexes, config.pointFiles.output.schemaIndexes)
  }
}

export async function migratePrisma(
  c: IConfig,
  name: string
) {

  await composeSchema(c)

  tryGenerateClient(c)

  await runSpawn(['prisma', 'generate'], { cwd: c.cwd })

  await runSpawn(['prisma', 'migrate', 'dev', '--name', name], { cwd: c.cwd })
}