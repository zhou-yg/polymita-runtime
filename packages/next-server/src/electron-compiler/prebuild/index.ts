import fs from 'fs';
import * as path from 'path'
import chalk from 'chalk';
import { spawn, execSync } from 'child_process';
import { IConfig } from '../../config';
import { logFrame } from '../../util';
import { compile } from 'ejs'
import { esbuild } from '../../compiler/bundleUtility';
import { externalModules } from '../../compiler';
import externalGlobals from '../../compiler/plugins/esbuild-globals';

export * from './generate'
export * from './generateMain'

const builderConfigTemplateFile = './builderConfig.ejs'
const builderConfigFilePath = path.join(__dirname, builderConfigTemplateFile)
const builderConfigTemplate = compile(fs.readFileSync(builderConfigFilePath).toString())

export const injectElectronBuilderConfig = (config: IConfig) => {
  // if (config.packageJSON.build) {
  //   return
  // }

  const name = config.packageJSON.name.replace(/[^a-zA-Z0-9]/gi, '').toLowerCase()
  const newBuilderConfigStr = builderConfigTemplate({
    name,
    appId: `polymita.${name}`,
  })

  const mergedJson = {
    ...config.packageJSON,
    build: JSON.parse(newBuilderConfigStr),
  };

  // Write the merged JSON back to the package.json file
  fs.writeFileSync(config.packageJSONPath, JSON.stringify(mergedJson, null, 2));
}

export const checkNativeDep = (config: IConfig) => {
  const dependencies = config.packageJSON.dependencies

  if (dependencies) {
    const dependenciesKeys = Object.keys(dependencies);
    const nativeDeps = fs
      .readdirSync('node_modules')
      .filter((folder) => fs.existsSync(`node_modules/${folder}/binding.gyp`));
    if (nativeDeps.length === 0) {
      return
    }
    try {
      // Find the reason for why the dependency is installed. If it is installed
      // because of a devDependency then that is okay. Warn when it is installed
      // because of a dependency
      const { dependencies: dependenciesObject } = JSON.parse(
        execSync(`npm ls ${nativeDeps.join(' ')} --json`).toString(),
      );
      const rootDependencies = Object.keys(dependenciesObject);
      const filteredRootDependencies = rootDependencies.filter((rootDependency) =>
        dependenciesKeys.includes(rootDependency),
      );
      if (filteredRootDependencies.length > 0) {
        const plural = filteredRootDependencies.length > 1;
        console.log(`
   ${chalk.whiteBright.bgYellow.bold(
          'Webpack does not work with native dependencies.',
        )}
  ${chalk.bold(filteredRootDependencies.join(', '))} ${plural ? 'are native dependencies' : 'is a native dependency'
          } and should be installed inside of the "./release/app" folder.
   First, uninstall the packages from "./package.json":
  ${chalk.whiteBright.bgGreen.bold('npm uninstall your-package')}
   ${chalk.bold(
            'Then, instead of installing the package to the root "./package.json":',
          )}
  ${chalk.whiteBright.bgRed.bold('npm install your-package')}
   ${chalk.bold('Install the package to "./release/app/package.json"')}
  ${chalk.whiteBright.bgGreen.bold(
            'cd ./release/app && npm install your-package',
          )}
   Read more about native dependencies at:
  ${chalk.bold(
            'https://electron-react-boilerplate.js.org/docs/adding-dependencies/#module-structure',
          )}
   `);
        return
      }
    } catch (e) {
      console.log('Native dependencies could not be checked');
    }
  }
}

// "electron-builder install-app-deps"
export const installAppDeps = async (config: IConfig) => {
  // Execute electron-builder install-app-deps
  logFrame('[installAppDeps]', 'running install-app-deps...');
  return new Promise<void>((resolve, reject) => {
    const installDeps = spawn('npx', ['electron-builder', 'install-app-deps'], { stdio: 'inherit' });
    installDeps.on('error', (e) => {
      console.error('error:', e)
      reject(new Error('install-app-deps failed'));
    })
    installDeps.on('data', (d) => {
      console.log('error:', d)
    })
    installDeps.on('close', (code: number) => {
      if (code !== 0) {
        logFrame('[installAppDeps]', 'install-app-deps failed');
        reject(new Error('install-app-deps failed'));
      } else {
        logFrame('[installAppDeps]', 'install-app-deps completed successfully');
        resolve();
      }
    });
  });
}
/**
 * build main.js for electron
 */
export async function buildApp(c: IConfig) {
  const entry = c.pointFiles.app.clientRoutes
  
  
  await esbuild({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    outfile: c.pointFiles.output.app,
    external: [
      ...Object.keys(externalModules(c.dependencyModules)),
    ],
    minify: false,
    define: {
      'process.env.HASH_ROUTER': '"true"',
    },
    plugins: [
      externalGlobals(externalModules(c.dependencyModules)),
    ],
  })
}

export const generateElectronApp = async (c: IConfig) => {

}
