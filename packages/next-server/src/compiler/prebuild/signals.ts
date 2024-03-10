import * as prismaInternals from '@prisma/internals'
import { IConfig, IViewConfig } from "../../config";
import * as fs from 'fs'
import * as path from 'path'
import { compile } from 'ejs'
import { traverseDir } from "../../util";

const signalMapTemplateFile = './signalsMapTemplate.ejs'
const signalMapTemplateFilePath = path.join(__dirname, signalMapTemplateFile)

const signalMapTemplate = compile(fs.readFileSync(signalMapTemplateFilePath).toString())

export function generateSignalMap (c: IConfig) {
  const signalsDir = path.join(c.cwd, c.signalsDirectory)
  const relativeSignals: { name: string, filePath: string }[] = []

  traverseDir(signalsDir,(f) => {
    if (!f.isDir) {
      const relativePath = path.relative(c.generateFiles.root, f.path)
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