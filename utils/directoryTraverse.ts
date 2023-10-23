import * as fs from 'node:fs'
import * as path from 'node:path'

type DirCallback = (path: string) => void
type FileCallback = (path: string) => void
export function preOrderDirectoryTraverse(dir: string, dirCallback: DirCallback, fileCallback: FileCallback) {
  for (const filename of fs.readdirSync(dir)) {
    if (filename === '.git') {
      continue
    }
    const fullpath = path.resolve(dir, filename)
    if (fs.lstatSync(fullpath).isDirectory()) {
      dirCallback(fullpath)
      // in case the dirCallback removes the directory entirely
      if (fs.existsSync(fullpath)) {
        preOrderDirectoryTraverse(fullpath, dirCallback, fileCallback)
      }
      continue
    }
    fileCallback(fullpath)
  }
}

export function postOrderDirectoryTraverse(dir: string, dirCallback: DirCallback, fileCallback: FileCallback) {
  for (const filename of fs.readdirSync(dir)) {
    if (filename === '.git') {
      continue
    }
    const fullpath = path.resolve(dir, filename)
    if (fs.lstatSync(fullpath).isDirectory()) {
      postOrderDirectoryTraverse(fullpath, dirCallback, fileCallback)
      dirCallback(fullpath)
      continue
    }
    fileCallback(fullpath)
  }
}
