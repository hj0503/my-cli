#!/usr/bin/env node

import * as fs from 'node:fs'
import * as path from 'node:path'

import * as ejs from 'ejs'

import minimist from 'minimist'
import prompts from 'prompts'
import { green, bold } from 'kolorist'

import { postOrderDirectoryTraverse, preOrderDirectoryTraverse } from './utils/directoryTraverse'
import renderTemplate from './utils/renderTemplate'
import getCommand from './utils/getCommand'
import { TemplateName } from './config/template'

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName)
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}

function canSkipEmptying(dir: string) {
  if (!fs.existsSync(dir)) {
    return true
  }

  const files = fs.readdirSync(dir)
  if (files.length === 0) {
    return true
  }
  if (files.length === 1 && files[0] === '.git') {
    return true
  }

  return false
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return
  }

  postOrderDirectoryTraverse(
    dir,
    (dir: string) => fs.rmdirSync(dir),
    (file: string) => fs.unlinkSync(file)
  )
}


async function init() {
  const cwd = process.cwd()

  const argv = minimist(process.argv.slice(2), {
    alias: {
      typescript: ['ts'],
      'with-tests': ['tests'],
      router: ['vue-router']
    },
    string: ['_'],
    // all arguments are treated as booleans
    boolean: true,
  })

  let targetDir = argv._[0]
  const defaultProjectName = !targetDir ? 'vue-project' : targetDir
  const isVue3 = argv.vue3
  const isVue2 = argv.vue2

  const forceOverwrite = argv.force // 是否强制覆盖

  let result: {
    templateName?: TemplateName
    projectName?: string
    packageName?: string
    shouldOverwrite?: boolean
  } = {}

  try {
    result = await prompts([
      {
        name: 'templateName',
        type: () => (isVue3 || isVue2 ? null : 'select'),
        message: '请选择模版类型',
        initial: 0,
        choices: [
          {
            title: TemplateName.Vue3,
            value: TemplateName.Vue3
          },
          {
            title: TemplateName.Vue2,
            value: TemplateName.Vue2
          },
        ]
      },
      {
        name: 'projectName',
        type: targetDir ? null : 'text',
        message: '请输入项目名称：',
        initial: defaultProjectName,
        onState: (state) => (targetDir = String(state.value).trim() || defaultProjectName)
      },
      {
        name: 'shouldOverwrite',
        type: () => (canSkipEmptying(targetDir) || forceOverwrite ? null : 'toggle'),
        message: () => {
          const dirForPrompt =
            targetDir === '.'
              ? '当前目录'
              : `目标文件夹 "${targetDir}"`

          return `${dirForPrompt} 非空，是否覆盖？`
        },
        initial: true,
        active: '是',
        inactive: '否'
      },
      {
        name: 'packageName',
        type: () => (isValidPackageName(targetDir) ? null : 'text'),
        message: '请输入包名称：',
        initial: () => toValidPackageName(targetDir),
        validate: (dir) => isValidPackageName(dir) || '无效的 package.json 名称'
      },
    ])
  } catch (cancelled) {
    console.log(cancelled)
    process.exit(1)
  }

  const {
    templateName = isVue3 ? TemplateName.Vue3 : TemplateName.Vue2,
    projectName, shouldOverwrite,
    packageName = projectName ?? defaultProjectName,
  } = result
  const ejsData = { ...result, packageName }

  const root = path.join(cwd, targetDir) // 计算目标文件夹的完整文件路径

  // 读取目标文件夹状态，看该文件夹是否是一个已存在文件夹，是否需要覆盖
  // 文件夹存在，则清空，文件夹不存在，则创建
  if (fs.existsSync(root) && shouldOverwrite) {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root)
  }
  // 一句提示, 脚手架项目在xxx目录
  console.log(`\n正在构建项目 ${root}...`)

  // 计算模板所在文件加路径
  const templateRoot = path.resolve(__dirname, 'template')
  const callbacks: ((dataStore: any) => Promise<void>)[] = []
  // 定义模板渲染 render 方法，参数为模板名
  const render = function render(templateName: string) {
    const templateDir = path.resolve(templateRoot, templateName)
    // 核心是这个 renderTemplate 方法，第一个参数是源文件夹目录，第二个参数是目标文件夹目录
    renderTemplate(templateDir, root, callbacks)
  }

  render(templateName)

  // An external data store for callbacks to share data
  const dataStore = {}
  // Process callbacks
  for (const cb of callbacks) {
    await cb(dataStore)
  }

  // EJS template rendering
  preOrderDirectoryTraverse(
    root,
    () => { },
    (filepath) => {
      if (filepath.endsWith('.ejs')) {
        const template = fs.readFileSync(filepath, 'utf-8')
        const dest = filepath.replace(/\.ejs$/, '')
        const content = ejs.render(template, { ...(dataStore[dest] || {}), ...ejsData })

        fs.writeFileSync(dest, content)
        fs.unlinkSync(filepath)
      }
    }
  )

  const userAgent = process.env.npm_config_user_agent ?? ''
  const packageManager = /pnpm/.test(userAgent) ? 'pnpm' : /yarn/.test(userAgent) ? 'yarn' : 'npm'
  console.log(`\n项目构建完成，可执行以下命令：\n`)
  if (root !== cwd) {
    const cdProjectName = path.relative(cwd, root)
    console.log(
      `  ${bold(green(`cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`))}`
    )
  }
  console.log(`  ${bold(green(getCommand(packageManager, 'install')))}`)
  console.log(`  ${bold(green(getCommand(packageManager, 'dev')))}`)
  console.log()
}

init().catch((e) => {
  console.error(e)
})