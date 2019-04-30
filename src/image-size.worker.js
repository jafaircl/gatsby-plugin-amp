import { readFile } from 'fs'
import { resolve } from 'path'
import { promisify } from 'util'
import sizeOf from 'image-size'
import got from 'got'

const isNumber = value => typeof value === 'number'
const getPath = file => resolve(process.cwd(), './static', file.replace(/^\//, ''))
const read = async file => await promisify(readFile)(getPath(file), { encoding: null })
const fetch = async url => (await got(url, { encoding: null })).body
const getBuffer = async src => await (/^https?:\/\//.test(src) ? fetch : read)(src)
const worker = async src => {
  try {
    const { width, height } = await sizeOf(await getBuffer(src))
    if (isNumber(width) && isNumber(height)) return { width, height }
  } catch {}
  return null
}

export default () => worker
