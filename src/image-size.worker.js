const got = require('got')
const { resolve } = require('path')
const sizeOf = require('image-size')

const readFile = require('util').promisify(require('fs').readFile)

const read = async src => {
  const path = resolve(process.cwd(), './static', src.replace(/^\//, ''))
  return await readFile(path, { encoding: null })
}

const request = async url => {
  const { body } = await got(url, { encoding: null, responseType: 'buffer' })
  return body
}

const getBuffer = src => (/^https?:\/\//.test(src) ? request : read)(src)

module.exports = () => {
  return async src => {
    try {
      const buffer = await getBuffer(src)
      const dimensions = await sizeOf(buffer)
      if (dimensions && dimensions.width && dimensions.height) {
        return { width: dimensions.width, height: dimensions.height }
      }
    } catch (e) {}

    return null
  }
}
