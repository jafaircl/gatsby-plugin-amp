import React, { Fragment } from 'react'
import { renderToString } from 'react-dom/server'
import flattenDeep from 'lodash.flattendeep'

import Boilerplate from './boilerplate'
import CustomElement from './custom-element'
import StyleSheet from './stylesheet'
import Analytics from './analytics'
import setImgDimensions from './set-img-dimensions'

const { JSDOM } = eval('require("jsdom")')

const interpolator = map => str => str.replace(/{{\s*[\w\.]+\s*}}/g, match => map[match.replace(/[{}]/g, '')])
const forbiddenRel = ['preconnect', 'dns-prefetch', 'preload']

export const onPreRenderHTML = (
  {
    getHeadComponents,
    replaceHeadComponents,
    getPreBodyComponents,
    replacePreBodyComponents,
    getPostBodyComponents,
    replacePostBodyComponents,
    pathname,
  },
  { analytics, components = [], pathIdentifier = '/amp/' },
) => {

  const headComponents = flattenDeep(getHeadComponents())
  const preBodyComponents = getPreBodyComponents()
  const postBodyComponents = getPostBodyComponents()
  const isAmp = pathname && pathname.indexOf(pathIdentifier) > -1

  if (!isAmp) return

  replaceHeadComponents([
    <Boilerplate key="gatsby-plugin-amp-boilerplate" />,
    <StyleSheet components={headComponents} key="gatsby-plugin-amp-stylesheet" />,
    ...components.map(component => (
      <CustomElement component={component} key={`gatsby-plugin-component-${JSON.stringify(component)}`} />
    )),
    analytics ? <CustomElement component="amp-analytics" key="gatsby-plugin-amp-analytics" /> : undefined,
    ...headComponents.filter(({ type, key = '', props = {} }) => {
      if (type === 'meta') return props.name !== 'viewport'
      if (type === 'style') return false
      if (type === 'script') return props.type === 'application/ld+json'
      if (key === 'TypographyStyle') return false
      if (type === 'link' && props.rel && props.rel.split(' ').some(rel => forbiddenRel.includes(rel))) return false
      return true
    }),
  ])
  replacePreBodyComponents(preBodyComponents.filter(x => x.key !== 'plugin-google-tagmanager'))
  replacePostBodyComponents(postBodyComponents.filter(x => x.type !== 'script'))
}

const ClientIdApi = ({ use }) => {
  return use ? <meta name="amp-google-client-id-api" content="googleanalytics" /> : <Fragment />
}

export const onRenderBody = (
  { setHeadComponents, setHtmlAttributes, setPreBodyComponents, pathname },
  {
    analytics,
    canonicalBaseUrl,
    pathIdentifier = '/amp/',
    relCanonicalPattern = '{{canonicalBaseUrl}}{{pathname}}',
    useAmpClientIdApi = false,
  },
) => {

  const isAmp = pathname && pathname.indexOf(pathIdentifier) > -1
  if (!isAmp) return

  setHtmlAttributes({ amp: '' })
  setHeadComponents([
    <link
      rel="canonical"
      key="gatsby-plugin-amp-link-canonical"
      href={interpolator({
        canonicalBaseUrl,
        pathname: pathname.replace(pathIdentifier, ''),
      })(relCanonicalPattern).replace(/([^:])(\/\/+)/g, '$1/')}
    />,
    <ClientIdApi key="gatsby-plugin-amp-google-client-id-api" use={useAmpClientIdApi} />,
  ])
  setPreBodyComponents([<Analytics analytics={analytics} interpolate={interpolator({ pathname })} />])
}

export const replaceRenderer = (
  { bodyComponent, replaceBodyHTMLString, setHeadComponents, pathname },
  { pathIdentifier = '/amp/' },
) => {
  const defaults = {
    image: {
      width: 640,
      height: 475,
      layout: 'responsive',
    },
    twitter: {
      width: "390",
      height: "330",
      layout: "responsive"
    },
    iframe: {
      width: 640,
      height: 475,
      layout: 'responsive',
    },
  }

  const newHeadComponents = {}
  const isAmp = pathname && pathname.indexOf(pathIdentifier) > -1
  if (!isAmp) return
  const bodyHTML = renderToString(bodyComponent)
  const dom = new JSDOM(bodyHTML)
  const document = dom.window.document

  // remove custom script tags, except JSON-LD metadata
  const scripts = [].slice.call(document.body.querySelectorAll('script:not([type="application/ld+json"])'))
  scripts.forEach(node => node.parentNode.removeChild(node))

  // convert images to amp-img or amp-anim
  const images = [].slice.call(document.getElementsByTagName('img'))
  images.forEach(image => {
    let ampImage
    if (image.src && image.src.indexOf('.gif') > -1) {
      ampImage = document.createElement('amp-anim')
      newHeadComponents['amp-anim'] = { name: 'amp-anim', version: '0.1' }
    } else {
      ampImage = document.createElement('amp-img')
    }
    const attributes = Object.keys(image.attributes)
    const includedAttributes = attributes.map(key => {
      const attribute = image.attributes[key]
      ampImage.setAttribute(attribute.name, attribute.value)
      return attribute.name
    })
    Object.keys(defaults.image).forEach(key => {
      if (includedAttributes && includedAttributes.indexOf(key) === -1) {
        ampImage.setAttribute(key, defaults.image[key])
      }
    })
    setImgDimensions(ampImage)
    image.parentNode.replaceChild(ampImage, image)
  });

    // remove 20px by 20px blur up background image CSS as it's > 1000 bytes - not AMP compatible
    const gatsbyRespBackgroundImages = [].slice.call(
      document.getElementsByClassName("gatsby-resp-image-background-image")
    );
    gatsbyRespBackgroundImages.forEach(gatsbyRespBackgroundImage => {
      gatsbyRespBackgroundImage.style.backgroundImage = "";
    });

  // convert twitter posts to amp-twitter
  const twitterPosts = [].slice.call(document.getElementsByClassName('twitter-tweet'))
  twitterPosts.forEach(post => {
    newHeadComponents['amp-twitter'] = { name: 'amp-twitter', version: '0.1' }
    const ampTwitter = document.createElement('amp-twitter')
    const attributes = Object.keys(post.attributes)
    const includedAttributes = attributes.map(key => {
      const attribute = post.attributes[key]
      ampTwitter.setAttribute(attribute.name, attribute.value)
      return attribute.name
    })
    Object.keys(defaults.twitter).forEach(key => {
      if (includedAttributes && includedAttributes.indexOf(key) === -1) {
        ampTwitter.setAttribute(key, defaults.twitter[key])
      }
    })
    // grab the last link in the tweet for the twee id
    const links = [].slice.call(post.getElementsByTagName('a'))
    const link = links[links.length - 1]
    const hrefArr = link.href.split('/')
    const id = hrefArr[hrefArr.length - 1].split('?')[0]
    ampTwitter.setAttribute('data-tweetid', id)
    // clone the original blockquote for a placeholder
    const _post = post.cloneNode(true)
    _post.setAttribute('placeholder', '')
    ampTwitter.appendChild(_post)
    post.parentNode.replaceChild(ampTwitter, post)
  })

  // convert iframes to amp-iframe or amp-youtube
  const iframes = [].slice.call(document.getElementsByTagName('iframe'))
  iframes.forEach(iframe => {
    let ampIframe
    let attributes
    if (iframe.src && iframe.src.indexOf('youtube.com/embed/') > -1) {
      newHeadComponents['amp-youtube'] = { name: 'amp-youtube', version: '0.1' }
      ampIframe = document.createElement('amp-youtube')
      const src = iframe.src.split('/')
      const id = src[src.length - 1].split('?')[0]
      ampIframe.setAttribute('data-videoid', id)
      const placeholder = document.createElement('amp-img')
      placeholder.setAttribute('src', `https://i.ytimg.com/vi/${id}/mqdefault.jpg`)
      placeholder.setAttribute('placeholder', '')
      placeholder.setAttribute('layout', 'fill')
      ampIframe.appendChild(placeholder)

      const forbidden = ['allow', 'allowfullscreen', 'frameborder', 'src']
      attributes = Object.keys(iframe.attributes).filter(key => {
        const attribute = iframe.attributes[key]
        return !forbidden.includes(attribute.name)
      })
    } else {
      newHeadComponents['amp-iframe'] = { name: 'amp-iframe', version: '0.1' }
      ampIframe = document.createElement('amp-iframe')
      if (!iframe.sandbox) iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-forms allow-same-origin')
      attributes = Object.keys(iframe.attributes)
    }

    const includedAttributes = attributes.map(key => {
      const attribute = iframe.attributes[key]
      ampIframe.setAttribute(attribute.name, attribute.value)
      return attribute.name
    })
    Object.keys(defaults.iframe).forEach(key => {
      if (includedAttributes && includedAttributes.indexOf(key) === -1) {
        ampIframe.setAttribute(key, defaults.iframe[key])
      }
    })
    iframe.parentNode.replaceChild(ampIframe, iframe)
  })

  setHeadComponents(
    Object.values(newHeadComponents).map(component => (
      <CustomElement key={`new-head-components-${component.name}`} component={component} />
    )),
  )

  // [HACK]: expose a cleaner way of replacing this props
  const transformed = document.body.children[0].outerHTML.replace(/data-(option|on|selected)=/g, '$1=')

  replaceBodyHTMLString(transformed)
}
