const { isPlugins } = require('zhu-cli-shared-utils')
const GeneratorAPI = require('./GeneratorAPI')
const normalizeFilePaths = require('./util/normalizeFilePaths')
const writeFileTree = require('./util/writeFileTree')
class Generator {
  /**
   *
   * @param context 项目目录
   * @param pkg 项目的package.json
   * @param plugins 插件对象
   */
  constructor(context, { pkg, plugins = [] }) {
    this.context = context
    this.plugins = plugins
    // 生成器先把所有要生成的文件和文件内容放在files对象中
    this.files = {}
    this.fileMiddlewares = []
    this.pkg = pkg
    const arr = Object.keys(this.pkg.dependencies || {}).concat(this.pkg.devDependencies || {})
    this.allPluginsIds = arr.filter(isPlugins)
    // 写死了
    const cliService = plugins.find(p => p.id === '@vue/cli-service')
    this.rootOptions = cliService.options
  }

  async generate() {
    // 初始化插件 修改了fileMiddleware pkg
    await this.initPlugins()
    // 提取package的配置文件到单独文件中
    this.extractConfigFile()
    await this.resolveFiles()
    console.log('---------------程序结束---------------')
  }

  async initPlugins() {
    let { rootOptions } = this
    debugger
    console.log('开始初始化插件')
    for (const plugin of this.plugins) {
      const { id, apply, options } = plugin
      const api = new GeneratorAPI(id, this, options, rootOptions)
      await apply(api, options, rootOptions)
    }
    console.log('初始化插件完成')
    console.log(this.fileMiddlewares, this.pkg, '--------fileMiddlewares  ---  pkg---------------')
  }

  extractConfigFile() {

  }

  hasPlugin(_id) {
    return [
      ...this.plugins.map(p => p.id),
      ...this.allPluginsIds
    ].some(id => id === _id)
  }

  // 真正执行中间件
  async resolveFiles() {
    for (const middleware of this.fileMiddlewares) {
      await middleware(this.files)
    }
    normalizeFilePaths(this.files)
    this.sortPkg()
    // 更新package.json文件
    this.files['package.json'] = JSON.stringify(this.pkg, null, 2)
    //安装额外依赖包 npm install
    await writeFileTree(this.context, this.files)
  }

  sortPkg() {
    console.log('对依赖包排序')
  }

}

module.exports = Generator
