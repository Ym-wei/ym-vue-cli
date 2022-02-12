const pluginsRE = /^@vue\/cli-plugin-/
exports.isPlugins = (id) => {
    return pluginsRE.test(id)
}
// 转换短id
exports.toShortPluginId = (id) => {
    return id.replace(pluginsRE, '')
}



