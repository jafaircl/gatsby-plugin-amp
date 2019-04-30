import rpc from 'sync-rpc'
import { resolve } from 'path'

const sizeOf = rpc(resolve('node_modules', 'gatsby-plugin-amp', 'image-size.worker.js'))

const setImgDimensions = imgNode => {
  try {
    const src = imgNode.src || imgNode.getAttribute('src')
    if (!src) return
    const dimensions = sizeOf(src)

    if (!dimensions || !dimensions.width || !dimensions.height) {
      throw new Error(`error reading image dimensions: "${src}"`)
    }

    const { width, height } = dimensions
    imgNode.setAttribute('width', width)
    imgNode.setAttribute('height', height)
  } catch (e) {
    console.warn(`\n${e.message || e}`)
  }
}

export default setImgDimensions
