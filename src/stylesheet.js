import React from 'react'
import CleanCSS from 'clean-css'

const clean = string => CleanCSS({ level: 2 })(string).replace(/\W*!important/g, '')

const StyleSheet = ({ components }) => {
  const styles = components.reduce((str, { type, props = {}, key = '' }) => {
    if (type === 'style' && props.dangerouslySetInnerHTML) return str + props.dangerouslySetInnerHTML.__html
    if (key === 'TypographyStyle' && props.typography) return str + props.typography.toString()
    return str
  }, '')
  return <style amp-custom="">{clean(styles)}</style>
}

export default StyleSheet
