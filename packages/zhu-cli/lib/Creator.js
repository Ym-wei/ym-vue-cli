const inquirer = require('inquirer')
let { defaults } = require('./options')
let PromptModuleAPI = require('./PromptModuleAPI')
let writeFileTree = require('./util/writeFileTree')
let Generator = require('./Generator')
let cloneDeep = require('lodash.clonedeep')
const { execa, loadModule } = require('zhu-cli-shared-utils')
const isManualMode = answers => answers.preset === '__manual__'
class Creator {
  constructor(name, context, promptModules) {
    this.name = name
    this.context = context
    const { presetPrompt, featurePrompt } = this.resolveIntroPrompts()
    this.presetPrompt = presetPrompt//presetPrompt对象有几个属性key??
    this.featurePrompt = featurePrompt//现在这里的选项是一个空数组
    //当前选择了某个特性后，这个特性可能会添加新的选择项 unit test  jest mocha  vueVersion 2 3
    this.injectedPrompts = []
    this.promptCompleteCbs = []//当选择完所有的选项后执行的回调数组
    this.run = this.run.bind(this)
    const PromptAPI = new PromptModuleAPI(this)
    promptModules.forEach(m => m(PromptAPI))
  }

  run(command, args) {
    // 在context目录下执行命令
    return execa(command, args, {
      cwd: this.context
    })
  }

  async create() {
    // name 项目名
    // content 路径
    const { name, context } = this
    let preset = await this.promptAndResolvePreset()
    preset = cloneDeep(preset)
    // '@vue/cli-service' 是核心包 serve, build
    preset.plugins['@vue/cli-service'] = Object.assign({ projectName: name }, preset)
    console.log(`Creating project in ${context}`)
    const pkg = {
      name,
      version: '0.1.0',
      private: true,
      devDependencies: {}
    }
    const deps = Object.keys(preset.plugins) // '@vue/cli-service'
    deps.forEach(dep => {
      pkg.devDependencies[dep] = 'latest'
    })
    await writeFileTree(context, {
      'package.json': JSON.stringify(pkg, null, 2)
    })
    // console.log(' initializing git cangku')
    // // 初始化仓库
    // await this.run(' git init')
    console.log('正在安装依赖----------')
    // 安装依赖
    try {
      await this.run('npm install')
    } catch (e) {
      console.log(e, 'e ')
    }
    console.log('开始调用生成器')
    // 调用生成器
    const plugins = await this.resolvePlugins(preset.plugins)
    console.log(plugins, '所有的插件 ')
    const generator = new Generator(context, { pkg, plugins })
    console.log(generator, 'generator构造器')
    await generator.generate()
  }

  async resolvePlugins(rawPlugins) { // {@vue/cli-service}
    const plugins = []
    for (const id of Object.keys(rawPlugins)) {
      const apply = loadModule(`${id}/generator`, this.context)
      let options = rawPlugins[id]
      plugins.push({ id, apply, options })
    }
    return plugins
  }

  resolvePreset(name) {
    return this.getPresets()[name]
  }

  resolveFinalPrompts() {
    this.injectedPrompts.forEach(prompt => {
      let originWhen = prompt.when || (() => true)
      prompt.when = answers => {
        //如果是手工模式并且answers里有vueVersion特性的话才会弹出来
        return isManualMode(answers) && originWhen(answers)
      }
    })
    let prompts = [
      this.presetPrompt,//先让你选预设 default default vue3 manual
      this.featurePrompt,//再让你选特性  feature
      ...this.injectedPrompts//不同的promptModule插入的选项
    ]
    return prompts
  }

  async promptAndResolvePreset() {
    let answers = await inquirer.prompt(this.resolveFinalPrompts())
    let preset
    if (answers.preset && answers.preset !== '__manual__') {
      preset = await this.resolvePreset(answers.preset)
    } else {
      preset = {//如果是手工选项的
        plugins: {} // 默认没有任何插件
      }
      answers.features = answers.features || []
      this.promptCompleteCbs.forEach(cb => cb(answers, preset))
    }
    return preset
  }

  getPresets() {
    return Object.assign({}, defaults)
  }

  resolveIntroPrompts() {
    let presets = this.getPresets()
    const presetChoices = Object.entries(presets).map(([name]) => {
      let displayName = name
      if (name === 'default') {
        displayName = 'Default'
      } else if (name === '__default_vue_3__') {
        displayName = 'Default (Vue 3)'
      }
      return {
        name: `${displayName}`,
        value: name
      }
    })
    //presetChoices=[{name:'Default',value:'default'},{name:'Default (Vue 3)'，value:'__default_vue_3__'}]
    const presetPrompt = {
      name: 'preset',//弹出项的名称 preset
      type: 'list',//如何选择 列表
      message: `Please pick a preset:`,//请选择一个预设
      choices: [
        ...presetChoices,
        {
          name: 'Manually select features',//手工选择特性
          value: '__manual__'
        }
      ]
    }
    const featurePrompt = {
      name: 'features',//弹出项的名称 features 手工选择的特性
      when: isManualMode,//如果when这个函数的返回值是true,就会弹出这个框，否则不弹这个框
      type: 'checkbox',//复选框
      message: 'Check the features needed for your project:',//手工你这个项目支持的特性
      choices: []
    }
    return { presetPrompt, featurePrompt }
  }

}

module.exports = Creator
