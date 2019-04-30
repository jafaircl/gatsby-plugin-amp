import React from 'react'
import CleanCSS from 'clean-css'

const minifier = new CleanCSS({ level: 1 })
const regex = /\W*!important/g
const clean = string => minifier.minify(string).styles.replace(regex, '')

const StyleSheet = ({ components }) => {
  const styles = components.reduce((str, { type, props = {}, key = '' }) => {
    if (type === 'style' && props.dangerouslySetInnerHTML) return str + props.dangerouslySetInnerHTML.__html
    if (key === 'TypographyStyle' && props.typography) return str + props.typography.toString()
    return str
  }, '')
  return <style amp-custom="" dangerouslySetInnerHTML={{ __html: clean(styles) }} />
}

export default StyleSheet
