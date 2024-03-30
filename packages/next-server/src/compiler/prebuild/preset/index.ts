import * as fs from 'fs'
import * as path from 'path'
import { compile } from 'ejs'
import shelljs from 'shelljs'

import { equalFileContent, loadJSON, traverseDir, tryMkdir } from "../../../util";
import { IConfig } from '../../../config';

const { cp } = shelljs;

const signalMapTemplateFile = './signalsMapTemplate.ejs'
const signalMapTemplateFilePath = path.join(__dirname, signalMapTemplateFile)

const signalMapTemplate = compile(fs.readFileSync(signalMapTemplateFilePath).toString())

export function copyContextFiles (c: IConfig) {
  tryMkdir(c.generateFiles.root)

  const files = [
    [path.join(__dirname, './actionsTemplate.ejs'), c.generateFiles.actionsFile],
    [path.join(__dirname, './connectTemplate.ejs'), c.generateFiles.connectFile],
    [path.join(__dirname, './hooksTemplate.ejs'), c.generateFiles.hooksFile],
  ]

  files.forEach(([from, to]) => {
    cp(from, to)
  })
}

export function generateSignalMap (c: IConfig) {
  const signalsDir = path.join(c.cwd, c.signalsDirectory)
  const relativeSignals: { name: string, filePath: string }[] = []

  traverseDir(signalsDir,(f) => {
    if (!f.isDir) {
      const relativePath = `./signals/${f.relativeFile}`
      relativeSignals.push({
        name: f.name,
        filePath: relativePath.replace(/\.\w+$/, '')
      })
    }
  })

  const signalMapFileContent = signalMapTemplate({ files: relativeSignals })

  fs.writeFileSync(
    path.join(c.generateFiles.signalMap),
    signalMapFileContent
  )
}