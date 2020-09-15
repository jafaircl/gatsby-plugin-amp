# gatsby-plugin-amp

Formats AMP-specific pages by removing javascript, combining styles and adding boilerplate. Read more about AMP (Accelerated Mobile Pages) [here](https://amp.dev/).

## Install

`npm install --save gatsby-plugin-amp`

## How to use

Create AMP-specific templates. Assume you have the following blog post template in `post.js`

```javascript
import React from 'react'
import Img from 'gatsby-image'
import Layout from '../../components/layout'

export default ({ data }) => (
  <Layout>
    <Img fluid={data.image.fluid} />
    <h1>REGULAR PAGE</h1>
    <p>regular page content</p>
  </Layout>
)
```

Create an AMP template `post.amp.js`

```javascript
import React from 'react'
import Layout from '../../components/layout'

export default ({ data }) => (
  <Layout>
    <amp-img src-set={data.image.srcSet} src={data.image.src} width={data.image.width} height={data.image.height} alt={data.image.altText} layout="responsive" />
    <h1>AMP PAGE</h1>
    <p>amp page content</p>
  </Layout>
)
```

To assist with situations like images in markdown or other externally created HTML, the plugin will attempt to turn `img` tags to `amp-img` or `amp-anim`. While creating posts in your `gatsby-node.js` file, create an additional page in the `/amp/` directory using the AMP template you just made

```javascript
_.each(posts, (post, index) => {
  const previous = index === posts.length - 1 ? null : posts[index + 1].node;
  const next = index === 0 ? null : posts[index - 1].node;

  createPage({
    path: post.node.fields.slug,
    component: path.resolve('./src/templates/post.js'),
    context: {
      slug: post.node.fields.slug,
      previous,
      next,
    },
  })

  createPage({
    path: `${post.node.fields.slug}/amp`,
    component: path.resolve('./src/templates/post.amp.js'),
    context: {
      slug: post.node.fields.slug,
      previous,
      next,
    },
  })
})
```

When you build your site, you should now have pages at `/my-awesome-post/index.html` and `/my-awesome-post/amp/index.html`

Add the plugin to the plugins array in your `gatsby-config.js`

```javascript
{
  resolve: `gatsby-plugin-amp`,
  options: {
    analytics: {
      type: 'gtag',
      dataCredentials: 'include',
      config: {
        vars: {
          gtag_id: <GA_TRACKING_ID>,
          config: {
            <GA_TRACKING_ID>: {
              page_location: '{{pathname}}'
            },
          },
        },
      },
    },
    canonicalBaseUrl: 'http://www.example.com/',
    components: ['amp-form'],
    excludedPaths: ['/404*', '/'],
    pathIdentifier: '/amp',
    relAmpHtmlPattern: '{{canonicalBaseUrl}}{{pathname}}{{pathIdentifier}}',
    useAmpClientIdApi: true,
  },
},
```

When your site builds, your page in the `/amp` directory should now be a valid AMP page

## Options

**analytics** `{Object}`
If you want to include any `amp-analytics` tags, set that configuration here.

&nbsp;&nbsp;&nbsp;&nbsp;**type** `{String}`
&nbsp;&nbsp;&nbsp;&nbsp;Your analytics type. See the list of available vendors [here](https://www.ampproject.org/docs/analytics/analytics-vendors).

&nbsp;&nbsp;&nbsp;&nbsp;**dataCredentials** `{String}`
&nbsp;&nbsp;&nbsp;&nbsp;You value for the `data-credentials` attribute. Omit to remove the attribute.

&nbsp;&nbsp;&nbsp;&nbsp;**config** `{Object | String}`
&nbsp;&nbsp;&nbsp;&nbsp;This can be either an object containing your analytics configuration or a url to your analytics configuration. If you use Google Analytics gtag, your cofiguration might look like this:

```javascript
vars: {
  gtag_id: <GA_TRACKING_ID>,
  config: {
    <GA_TRACKING_ID>: {
      page_location: '{{pathname}}'
    },
  },
},
```

&nbsp;&nbsp;&nbsp;&nbsp; If you use a tag manager, your config would simply be a url like `https://www.googletagmanager.com/amp.json?id=GTM-1234567&amp;gtm.url=SOURCE_URL`. You can use double curly braces to interpolate the pathname into a configuration value e.g. `page_location: '{{pathname}}'`. See [here](https://www.ampproject.org/docs/reference/components/amp-analytics) to learn more about `amp-analytics` configurations.

**canonicalBaseUrl** `{String}`
The base URL for your site. This will be used to create a `rel="canonical"` link in your amp template and `rel="amphtml"` link in your base page.

**components** `{Array<String | Object{name<String>, version<String>}>}`
The components you will need for your AMP templates. Read more about the available components [here](https://www.ampproject.org/docs/reference/components).

**excludedPaths**`{Array<String>}`
By default, this plugin will create `rel="amphtml"` links in all pages. If there are pages you would like to not have those links, include them here. You may use glob patterns in your strings (e.g. `/admin/*`). *this may go away if a way can be found to programatically exclude pages based on whether or not they have an AMP equivalent. But for now, this will work*

**includedPaths**`{Array<String>}`
By default, this plugin will create `rel="amphtml"` links in all pages. If, you would instead like to whitelist pages, include them here. You may use glob patterns in your strings (e.g. `/blog/*`). *this may go away if a way can be found to programatically exclude pages based on whether or not they have an AMP equivalent. But for now, this will work*

**pathIdentifier** `{String}`
The url segment which identifies AMP pages. If your regular page is at `http://www.example.com/blog/my-awesome-post` and your AMP page is at `http://www.example.com/blog/my-awesome-post/amp/`, your pathIdentifier should be `/amp/`

**relAmpHtmlPattern** `{String}`
The url pattern for your `rel="amphtml"` links. If your AMP pages follow the pattern `http://www.example.com/my-awesome-post/amp/`, the value for this should be `{{canonicalBaseUrl}}{{pathname}}{{pathIdentifier}}`.

**relCanonicalPattern** `{String}`
The url pattern for your `rel="canonical"` links. The default value is `{{canonicalBaseUrl}}{{pathname}}`.

**useAmpClientIdApi** `{Boolean}`
If you are using a Client ID for Google Analytics, you can use the [Google AMP Client ID](https://support.google.com/analytics/answer/7486764) to determine if events belong to the same user when they visit your site on AMP and non-AMP pages. Set this to `true` if you would like to include the necessary meta tag in your AMP pages. You can read more about this concept [here](https://www.simoahava.com/analytics/accelerated-mobile-pages-via-google-tag-manager/#2-1-client-id)

## Caveats

The standard HTML template that Gatsby uses will cause a validation error. This is because it is missing `minimum-scale=1` in the meta viewport tag. You can create a `html.js` template file under your `src/` directory in order to override the default Gatsby one available [here](https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby/cache-dir/default-html.js). Alternatively, you can simply clone it by runnig the shell command below at the root of your project. Read more [here](https://www.gatsbyjs.org/docs/custom-html/) on customizing your `html.js`.

```shell
cp .cache/default-html.js src/html.js
```

Don't forget to update the meta viewport tag value from its initial to the required AMP value.

```html
<!-- Initial viewport meta tag -->
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
<!-- Replacement viewport meta tag (for AMP validity) -->
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, shrink-to-fit=no" />
```

## Automatically Converted Elements

While it is preferable to create AMP-specific templates, there may be situations where an image, iframe or some other element can't be modified. To cover these cases, the plugin will attempt to convert certain tags to their AMP equivalent.

| HTML Tag       | AMP Tag           | Status                     | Issue |
|----------------|-------------------|----------------------------|-------|
| `img`          | `amp-img`         | Completed                  |       |
| `img (.gif)`   | `amp-anim`        | Completed                  |       |
| `iframe`       | `amp-iframe`      | Completed                  |       |
| `audio`        | `amp-audio`       | Planned, Not Started       |       |
| `video`        | `amp-video`       | Planned, Not Started       |       |
| YouTube        | `amp-youtube`     | Completed                  |       |
| Facebook       | `amp-facebook`    | Planned, Not Started       |       |
| Instagram      | `amp-instagram`   | Planned, Not Started       |       |
| Twitter        | `amp-twitter`     | Completed                  |       |
