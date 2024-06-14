import * as prismaInternals from '@prisma/internals'
import * as fs from 'fs'
import * as path from 'path'
import { traverseDir } from "../../util";
import { parseDeps } from "../analyzer";
import * as prettier from 'prettier'
import { IConfig } from "../../config";
import * as bundleUtility from '../bundleUtility';
import { equalFileContent, loadJSON, tryMkdir } from "../../util";
import { autoGeneratedFileTag, injectTagEnd, injectTagStart } from "../constants";
import shelljs from 'shelljs';

function template (
  origin: string,
  deps: string,
  assigns: string,
  filePath: string
) {
  return `${origin}
${injectTagStart}
${filePath}
${deps}
${assigns}
${injectTagEnd}
`
}

function cleanOriginalCodeTag (code: string) {
  const rows = code.split('\n')
  let si = -1
  let ei = -1
  rows.forEach((r, i) => {
    if (r.trim() === injectTagStart) {
      si = i
    } else if (r.trim() === injectTagEnd) {
      ei = i
    }
  })
  if (si >= 0 && ei >= 0) {
    return rows.slice(0, si).concat(rows.slice(ei + 1)).join('\n')
  }
  return code
}

let i = 0;

export async function injectDeps (c: IConfig, targetFile: string) {
  // check file exist
  if (!fs.existsSync(targetFile)) {
    return
  }

  const code = fs.readFileSync(targetFile).toString()
  if (!checkHasImportSignal(code)) {
    return
  }

  const parsed = path.parse(targetFile)

  const moduleName = c.packageJSON?.name

  const depsJSONPath = path.join(parsed.dir, `${parsed.name}.deps.json`)

  if (fs.existsSync(depsJSONPath)) {
    const depsJSON = loadJSON(depsJSONPath)

    const AUTO_PARSER = 'autoParser' + Date.now() + `_${i++}` 

    const arr = Object.keys(depsJSON).map(funcName => {
      return `Object.assign(${funcName}, {
  __deps__: ${AUTO_PARSER}.${funcName}.deps,
  __names__: ${AUTO_PARSER}.${funcName}.names,
  __name__: "${funcName}",
  __namespace__: "${moduleName}" })`
    })

    const codeIncludingDeps = template(
      cleanOriginalCodeTag(code),
      `const ${AUTO_PARSER} = ${JSON.stringify(depsJSON).replace(/"/g, "'")}`,
      arr.join('\n').replace(/"/g, "'"),
      `// location at:${targetFile}`
    )

    const codeIncludingDepsWithFormat = await prettier.format(codeIncludingDeps, { 
      parser: 'typescript'
    })

    if (
      !equalFileContent(code, codeIncludingDepsWithFormat) &&
      !(new RegExp(autoGeneratedFileTag).test(code))
    ) {
      fs.writeFileSync(targetFile, codeIncludingDepsWithFormat)
    }
  } else {
    throw new Error(`[injectDeps] not found deps.json with path "${depsJSONPath}"`)
  }
}

export async function buildSignals(c: IConfig) {
  const entry = c.signals.map(f => f.filePath)

  const result = await bundleUtility.esbuild({
    entryPoints: entry,
    outdir: c.pointFiles.outputSignalsDir,
  })

  await bundleUtility.buildDTS(
    c,
    entry,
    c.pointFiles.outputSignalsDir
  )

  generateHookDeps(c.pointFiles.outputSignalsDir)

  traverseDir(c.pointFiles.outputSignalsDir, f => {
    if (/\.js$/.test(f.file)) {
      injectDeps(c, f.path)
    }
  })
}


export async function generateSignalsAndDeps(c: IConfig) {

  const entry = c.signals.map(f => f.filePath)

  await bundleUtility.esbuild({
    entryPoints: entry,
    outdir: c.generateFiles.signalsDir,
  })

  const clearDeps = generateHookDeps(c.generateFiles.signalsDir, true)

  const sourceSignalDir = path.join(c.cwd, c.signalsDirectory)
  c.signals.forEach(f => {
    const relativePath = f.filePath.replace(sourceSignalDir, '').replace(/^\/+/, '')
    const dest = path.join(c.generateFiles.signalsDir, relativePath)
    fs.copyFileSync(
      f.filePath,
      dest
    )

    injectDeps(c, dest)
  })

  clearDeps()

  // copy composed signals
  const composeDir = path.join(sourceSignalDir, c.composeDriversDirectory);
  if (fs.existsSync(composeDir)) {
    shelljs.cp(
      '-r', 
      composeDir,
      path.join(c.generateFiles.signalsDir, c.composeDriversDirectory),
    )
  }
}

function checkHasImportSignal (code: string) {
  return /from\s?['"]@polymita\/signal/.test(code)
}

/** @TODO upgrade to typescript */
function generateHookDeps (signalsDir: string, removeSource?: boolean) {
 
  const depsFiles:string[] = []

  traverseDir(signalsDir, f => {
    if (/\.js$/.test(f.file)) {
      const compiledFile = f.path;
      const name = f.name

      const code = fs.readFileSync(compiledFile).toString()
      if (checkHasImportSignal(code)) {
        const deps = parseDeps({ file: compiledFile, code })      
  
        // json in tarat: generate deps.json
        const dest = path.join(f.dir, `${name}.deps.json`)
        fs.writeFileSync(dest, JSON.stringify(deps, null, 2))
        depsFiles.push(dest)
        if (removeSource) {
          fs.unlinkSync(f.path)
        }
      }
    }
  })

  return () => {
    depsFiles.forEach(f => {
      fs.unlinkSync(f)
    })
  }
}