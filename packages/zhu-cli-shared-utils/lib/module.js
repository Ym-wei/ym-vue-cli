
const Module = require('module')
const path = require('path')

/**
 * 转换路径
 * @param request @vue/cli-service/generator
 * @param context C:\project\zhu\hello1
 * @return {*}
 */
exports.loadModule = function(request, context){
  // 目录文件不一样
    return Module.createRequire(path.resolve(context, 'package.json'))(request)
}
