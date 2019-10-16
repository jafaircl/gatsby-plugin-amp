import rpc from 'sync-rpc'
import { resolve } from 'path'

const dirname = resolve(__filename, '..') // hack: __dirname is not working
const sizeOf = rpc(resolve(dirname, 'image-size.worker.js'))

const cache = new Map()

const getSizeOf = src => {
  if (cache.has(src)) return cache.get(src)
  let result = null

  try {
    result = sizeOf(src)
  } catch {}

  cache.set(src, result)
  if (!result || !result.width || !result.height) throw new Error(`error reading image dimensions: "${src}"`)
  return result
}

const setImgDimensions = imgNode => {
  try {
    const src = imgNode.src || imgNode.getAttribute('src')
    if (!src) return
    const { width, height } = getSizeOf(src)
    imgNode.setAttribute('width', width)
    imgNode.setAttribute('height', height)
  } catch (e) {
    console.warn(`\n${e.message || e}`)
  }
}

export default setImgDimensions
