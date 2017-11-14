import * as fs from 'fs'
import * as mage from 'mage'
import * as path from 'path'

import { crash } from './errors'

/**
 * Throw only if the error is not "file/folder not found"
 */
function throwIfNotFileNotFoundError(error: NodeJS.ErrnoException) {
  if (error.code !== 'ENOENT') {
    throw error
  }
}

/**
 * Load topics from each module's 'topics' folder
 *
 * This function is a helper you will use in your project's
 * `lib/archivist/index.js` file, as follow:
 *
 * ```typescript
 * import { loadTopicsFromModules } from 'mage-validator'
 *
 * loadTopicsFromModules(exports)
 * ```
 *
 * This will:
 *
 *   - Find all your projetc's modules
 *   - For each module folders, check if there is a `topics` folder
 *   - When a `topics` folder is found, require each file in it
 *   - Add the content of the require to exports[fileNameWithoutJSExtension]
 */
export function loadTopicsFromModules(exports: any) {
  const modules = mage.listModules()
  for (const moduleName of modules) {
    loadTopicsFromModule(exports, moduleName)
  }
}

/**
 * Load topics defined in a single module
 */
export function loadTopicsFromModule(archivistExports: any, moduleName: string) {
  const modulePath = mage.getModulePath(moduleName)
  const moduleTopicsPath = path.join(modulePath, 'topics')

  try {
    fs.readdirSync(moduleTopicsPath).forEach(function (topicFileName) {
      const topicPath = path.join(moduleTopicsPath, topicFileName)
      const topicPathInfo = path.parse(topicPath)
      const topicName = topicPathInfo.name

      // Skip all files but TypeScript source files
      if (topicPathInfo.ext !== '.ts') {
        return
      }

      if (archivistExports[topicName]) {
        throw crash('Topic is already defined!', {
          alreadySetByModule: archivistExports[topicName]._module,
          module: moduleName,
          topic: topicName,
        })
      }

      // Add topic to the export of lib/archivist/index.ts
      const topic = archivistExports[topicName] = require(topicPath).default
      topic._module = moduleName

      // No explicit class name defined; we assign the name of the file as
      // the class name used internally within the topic's methods
      if (topic.getClassName().substring(0, 8) === 'default_') {
        topic.setClassName(topicName)
      }
    })
  } catch (error) {
    throwIfNotFileNotFoundError(error)
  }
}
