import React, { Fragment } from 'react'

const Analytics = ({ analytics, interpolate }) => {
  if (!analytics) return <Fragment />
  return (
    <amp-analytics
      type={analytics.type}
      data-credentials={analytics.dataCredentials}
      config={typeof analytics.config === 'string' ? analytics.config : undefined}
    >
      {typeof analytics.config === 'string' ? (
        <Fragment />
      ) : (
        <script
          type="application/json"
          dangerouslySetInnerHTML={{ __html: interpolate(JSON.stringify(analytics.config)) }}
        />
      )}
    </amp-analytics>
  )
}
export default Analytics
