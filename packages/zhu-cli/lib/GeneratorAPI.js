const path = require('path')
const fs = require('fs')
const ejs = require('ejs')
const { toShortPluginId } = require('zhu-cli-shared-utils')
const mergeDeps = require('./util/mergeDeps')
const { isBinaryFileSync } = require('isbinaryfile')

const isString = val => typeof val === 'string'
const isObject = val => typeof val === 'object'

class GeneratorAPI {
  constructor(id, generator, options, rootOptions) {
    this.id = id
    this.generator = generator
    this.rootOptions = rootOptions
    this.options = options
    this.pluginsData = generator.plugins
      .filter(({ id }) => id !== '@vue/cli-service')
      .map(({ id }) => ({ name: toShortPluginId(id) }))
  }

  _injectFileMiddleware(middleware) {
    this.generator.fileMiddlewares.push(middleware)
  }

  // 合并
  _resolveData(additionalData) {
    const { options, rootOptions, pluginsData } = this
    return Object.assign({
      // 插件的对应配置对象
      options,
      // 根配置preset
      rootOptions,
      plugins: pluginsData
    }, additionalData)
  }

  /**
   *  核心方法
   * @param source  模板目录名称
   * @param additionalData 参数
   */
  render(source, additionalData) {
    // 提取当前的目录 生成器的目录
    const baseDir = extractCallDir()
    debugger
    if (isString(source)) {
      // 进入source目录
      source = path.resolve(baseDir, source)
      // 暂存函数
      this._injectFileMiddleware(async (files) =>{
        const data = this._resolveData(additionalData)
        const globby = require('globby')
        const _files = await globby(['**/*'], { cwd: source })
        console.log(_files, '_files ')
        for (const rawPath of _files) {
          const targetPath = rawPath.split('/').map(field => {
            // 文件名处理_gitignore => .gitignore
            if (field.charAt(0) === '_') {
              return `.${field.slice(1)}`
            }
            return field
          }).join('/')

          // 模板文件夹里面原文件绝对路径
          const sourcePath = path.resolve(source, rawPath)
          const content = renderFile(sourcePath, data)
          // 不管是二进制还是文本 先缓存files中
          files[targetPath] = content
        }
      })
    }
  }

  extendPackage(fields) {
    const pkg = this.generator.pkg
    const toMerge = fields
    for (const key of Object.keys(toMerge)) {
      const value = toMerge[key]
      let existing = pkg[key]
      if (isObject(value) && ['dependencies', 'devDependencies'].includes(key)) {
        pkg[key] = mergeDeps(existing || {}, value)
      } else {
        pkg[key] = value
      }
    }
  }

  hasPlugin(id) {
    return this.generator.hasPlugin(id)
  }
}

function renderFile(name, data) {
  if (isBinaryFileSync(name)) {
    return fs.readFileSync(name)
  }
  let template = fs.readFileSync(name, 'utf8')
  template = template.replace(/_/g, '')
  return ejs.render(template, data)
}

function extractCallDir() {
  const obj = {}
  Error.captureStackTrace(obj)
  const callSite = obj.stack.split('\n')[3]
  const namedStackRegExp = /\s\((.*):\d+:\d+\)$/
  const matchResult = callSite.match(namedStackRegExp)
  const fileName = matchResult[1]
  return path.dirname(fileName) // C:\Users\EDZ\Desktop\zhu-cli2\hello12\node_modules\@vue\cli-service\generator
}

module.exports = GeneratorAPI
