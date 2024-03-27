import * as fs from 'fs'
import * as path from 'path'
import * as prismaInternals from '@prisma/internals'
import { readCurrentPrisma, readExsitPrismaPart, transformModelName } from '../compose';

import { IConfig } from "../../config"
import { loadJSON, lowerFirst, traverse } from '../../util'
import { set, upperFirst } from 'lodash';
import { spawn } from 'child_process';

interface IModelIndexesBase {
  [k: string]: string | IModelIndexesBase
}

function findDependentIndexes (c: IConfig) {
  const schemaFiles: Array<{
    moduleName: string
    indexes: IModelIndexesBase
  }> = []

  c.dependencyModules.forEach(moduleName => {
    const dir = path.join(c.cwd, 'node_modules', moduleName)

    const depSchemaPath = path.join(dir, c.buildDirectory, c.modelsDirectory, c.schemaIndexes)
    const r2 = fs.existsSync(depSchemaPath)

    if (r2) {
      schemaFiles.push({
        moduleName,
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
  const schemaIndexes = loadJSON(c.currentFiles.schemaIndexes);
  
  if (Object.values(schemaIndexes).length <= 0) {
    return;
  }

  const model = await prismaInternals.getGenerator({
    schemaPath: c.currentFiles.targetSchemaPrisma,
    dataProxy: false,
  })
  const clientOutput = model.config.output.value;
  model.stop()

  const prismaTypesFile = path.join(clientOutput, 'index.d.ts')

  if (!fs.existsSync(prismaTypesFile)) {
    return;
  }

  const result: string[] = []

  traverse(schemaIndexes, (keys, val: string | IModelIndexesBase) => {
    if (typeof val === 'string') {
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

  fs.writeFileSync(c.currentFiles.schemaIndexesTypes, dts)

}

async function generateModelTypes(c: IConfig) {
  if (c.model.engine !== 'prisma') {
    return
  }
  const schemaIndexes = loadJSON(c.currentFiles.schemaIndexes);
  
  if (Object.values(schemaIndexes).length <= 0) {
    return;
  }

  const model = await prismaInternals.getGenerator({
    schemaPath: c.currentFiles.targetSchemaPrisma,
    dataProxy: false,
  })
  const clientOutput = model.config.output.value;
  const prismaTypes = path.join(clientOutput, 'index.d.ts')

  if (!fs.existsSync(prismaTypes)) {
    return;
  }

  const prismaTypesContent = fs.readFileSync(prismaTypes).toString();

  function findInterfaceDeclaration (interfaceName: string) {
    interfaceName = upperFirst(interfaceName)

    const declarationHead = `export type ${interfaceName} = {`;
    const start = prismaTypesContent.indexOf(declarationHead)

    if (start > 0) {
      for (let i = start; i < prismaTypesContent.length; i++) {
        if (prismaTypesContent[i] === '}') {
          return prismaTypesContent.substring(start, i + 1)
        }
      }
    }
  }

  const result: string[] = []

  traverse(schemaIndexes, (keys, val: string | IModelIndexesBase) => {
    if (typeof val === 'string') {
      const interfaceText = findInterfaceDeclaration(val);
      if (interfaceText) {
        result.push(interfaceText)
      }
    }
  })

  fs.writeFileSync(c.currentFiles.schemaIndexesTypes, result.join('\n'))
}

export async function buildModelIndexes(c: IConfig) {
  if (c.model.engine === 'prisma') {

    const dependentIndexes = findDependentIndexes(c)

    let existPrismaPart = readExsitPrismaPart(c)

    if (existPrismaPart.length <= 0) {
      existPrismaPart = [].concat(readCurrentPrisma(c))
    }

    const schemaIndexesFile = path.join(c.cwd, c.modelsDirectory, c.schemaIndexes)

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
      const dependentIndexesWithNamespace = deepInsertName(obj.moduleName, obj.indexes)

      mergedObj[obj.moduleName] = dependentIndexesWithNamespace
    })

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
}
