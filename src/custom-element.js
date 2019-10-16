import React from 'react'

const getVersion = component => component.version || 0.1
const getName = component => (typeof component === 'string' ? component : component.name)
const getUrl = (name, version) => `https://cdn.ampproject.org/v0/${name}-${version}.js`

const CustomElement = ({ component }) => {
  const name = getName(component)
  const url = getUrl(name, getVersion(component))
  return <script key={`gatsby-plugin-amp-custom-element-${url}`} async custom-element={name} src={url} />
}

export default CustomElement
