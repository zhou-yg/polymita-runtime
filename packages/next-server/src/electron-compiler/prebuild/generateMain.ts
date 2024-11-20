import { IConfig } from "../../config";
import fs from 'fs';
import * as path from 'path'
import chalk from 'chalk';
import { compile } from 'ejs'
import { tryMkdir } from "../../util";

const releaseAppPkgTemplateFile = './appPackageJSON.ejs'
const releaseAppPkgFilePath = path.join(__dirname, releaseAppPkgTemplateFile)
const releaseAppPkgTemplate = compile(fs.readFileSync(releaseAppPkgFilePath).toString())

// Add new template compilations
const mainJsTemplateFile = './mainJs.ejs'
const mainJsFilePath = path.join(__dirname, mainJsTemplateFile)
const mainJsTemplate = compile(fs.readFileSync(mainJsFilePath).toString())

const menuTemplateFile = './menu.ejs'
const menuFilePath = path.join(__dirname, menuTemplateFile)
const menuTemplate = compile(fs.readFileSync(menuFilePath).toString())

const preloadTemplateFile = './preload.ejs'
const preloadFilePath = path.join(__dirname, preloadTemplateFile)
const preloadTemplate = compile(fs.readFileSync(preloadFilePath).toString())

function generateMainJS(c: IConfig) {
  const code = mainJsTemplate({
  })
  fs.writeFileSync(c.pointFiles.generates.app.main, code)
}
function generateMenu(c: IConfig) {
  const code = menuTemplate({
  })
  fs.writeFileSync(c.pointFiles.generates.app.menu, code)
}
function generatePreloadJS(c: IConfig) {
  const code = preloadTemplate({
  })
  fs.writeFileSync(c.pointFiles.generates.app.preload, code)
}

export function generateMainFiles(c: IConfig) {
  tryMkdir(c.pointFiles.generates.app.mainDir)
  generateMainJS(c)
  generateMenu(c)
  generatePreloadJS(c)
}