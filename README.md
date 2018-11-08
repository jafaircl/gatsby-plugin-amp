# Usage

```javascript
{
  resolve: `gatsby-plugin-amp`,
  options: {
    canonicalBaseUrl: 'http://www.example.com/',
    components: ['amp-form'],
    excludedPaths: ['/404.html', '/'],
    googleTagManager: {
      containerId: 'GTM-1234567',
    },
    pathIdentifier: '/amp/',
    useAmpClientIdApi: true,
  },
},
```