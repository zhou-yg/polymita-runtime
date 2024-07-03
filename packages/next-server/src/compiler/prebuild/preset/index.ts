import * as fs from 'fs'
import * as path from 'path'
import { compile } from 'ejs'
import shelljs from 'shelljs'

import { equalFileContent, loadJSON, traverseDir, tryMkdir } from "../../../util";
import { IConfig } from '../../../config';
import { upperFirst } from 'lodash';

const { cp } = shelljs;

const signalMapTemplateFile = './signalsMapTemplate.ejs'
const signalMapTemplateFilePath = path.join(__dirname, signalMapTemplateFile)

const signalMapTemplate = compile(fs.readFileSync(signalMapTemplateFilePath).toString())

export function copyContextFiles (c: IConfig) {
  tryMkdir(c.generateFiles.root)

  const r2 = fs.existsSync(c.modelFiles.schemaPrisma)

  const files = [
    [
      r2 ||  c.dependencyLibs.signalModel,
      path.join(__dirname, './actionsTemplate.ejs'), c.generateFiles.actionsFile
    ],
    [
      r2,
      path.join(__dirname, './connectTemplate.ejs'), c.generateFiles.connectFile
    ],
    [
      c.dependencyLibs.signalModel,
      path.join(__dirname, './hooksTemplate.ejs'), c.generateFiles.hooksFile
    ],
  ] as [boolean, string, string][];

  files
    .forEach(([s, from, to]) => {
      if (s) {
        cp(from, to)
      } else if (fs.existsSync(to)) {
        fs.unlinkSync(to)
      }
    })
}

export function generateSignalMap (c: IConfig) {
  const signalsDir = path.join(c.cwd, c.signalsDirectory)
  const relativeSignals: { name: string, filePath: string }[] = []

  if (fs.existsSync(signalsDir)) {
    traverseDir(signalsDir,(f) => {
      if (!f.isDir) {
        const relativePath = `./signals/${f.relativeFile}`
        const name = /^compose\//.test(f.relativeFile) ? `compose${upperFirst(f.name)}` : f.name
        relativeSignals.push({
          name,
          filePath: relativePath.replace(/\.\w+$/, '')
        })
      }
    })
  }
  const signalMapFileContent = signalMapTemplate({ files: relativeSignals })

  fs.writeFileSync(
    path.join(c.generateFiles.signalMap),
    signalMapFileContent
  )
}