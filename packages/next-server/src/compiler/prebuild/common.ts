import { readdirSync } from "fs";
import { IConfig } from "../../config";
import { join } from "path";
import { runTSC } from "../bundleUtility";
import { traverseDir } from "../../util";

export async function buildCommonDirs(c: IConfig) {
  const dirs = readdirSync(c.cwd)
    .filter(name => /^[a-zA-Z0-9]+$/.test(name))
    .filter(name => !c.preservedDirs.includes(name))
    .map(name => {
      return name
    })

  await Promise.all(dirs.map(name => {
    const dir = join(c.cwd, name)
    const dest = join(c.pointFiles.outputDir, name)

    const files: string[] = []
    traverseDir(dir, f => {
      if (/\.ts(x)?/.test(f.file)) {
        files.push(f.path)
      }
    })

    return runTSC(c, files, dest)
  }))

  dirs.forEach(name => {
    console.log(`build dir "${name}" done`)
  })
}