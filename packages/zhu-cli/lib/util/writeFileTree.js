
let fs = require('fs-extra')
let path = require('path')

module.exports = async function(dir, files){
    Object.keys(files).forEach(name => {
      console.log(dir, name, ' 12121')
      const filePath = path.join(dir, name)
      // 确保文件所在的目录存在, 不存在会创建
      fs.ensureDirSync(path.dirname(filePath))
      fs.writeFileSync(filePath, files[name])
    })
}
