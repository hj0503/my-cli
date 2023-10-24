import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Renders a template folder/file to the file system,
 * by recursively copying all files under the `src` directory,
 * with the following exception:
 *   - `_filename` should be renamed to `.filename`
 *   - Fields in `package.json` should be recursively merged
 * @param {string} src source filename to copy
 * @param {string} dest destination filename of the copy operation
 */
function renderTemplate(src: string, dest: string, callbacks: ((dataStore: any) => Promise<void>)[]) {
  const stats = fs.statSync(src)

  if (stats.isDirectory()) {
    // skip node_module
    if (path.basename(src) === 'node_modules') {
      return
    }

    // if it's a directory, render its subdirectories and files recursively
    fs.mkdirSync(dest, { recursive: true })
    for (const file of fs.readdirSync(src)) {
      renderTemplate(path.resolve(src, file), path.resolve(dest, file), callbacks)
    }
    return
  }

  const filename = path.basename(src)
  // data file for EJS templates
  if (filename.endsWith('.data.ejs')) {
    // use dest path as key for the data store
    dest = dest.replace(/\.data\.mjs$/, '')

    // Add a callback to the array for late usage when template files are being processed
    callbacks.push(async (dataStore) => {
      const getData = (await import(pathToFileURL(src).toString())).default

      // Though current `getData` are all sync, we still retain the possibility of async
      dataStore[dest] = await getData({
        oldData: dataStore[dest] || {}
      })
    })

    return // skip copying the data file
  }
  fs.copyFileSync(src, dest)
}

export default renderTemplate
