import React, { Fragment } from "react";
import { renderToString } from "react-dom/server";
import { Minimatch } from "minimatch";
import flattenDeep from "lodash.flattendeep";
const JSDOM = eval('require("jsdom")').JSDOM;
const minimatch = require("minimatch");

const ampBoilerplate = `body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}`;
const ampNoscriptBoilerplate = `body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}`;

const interpolate = (str, map) =>
  str.replace(/{{\s*[\w\.]+\s*}}/g, match => map[match.replace(/[{}]/g, "")]);

export const onPreRenderHTML = (
  {
    getHeadComponents,
    replaceHeadComponents,
    getPreBodyComponents,
    replacePreBodyComponents,
    getPostBodyComponents,
    replacePostBodyComponents,
    pathname
  },
  {
    analytics,
    canonicalBaseUrl,
    components = [],
    includedPaths = [],
    excludedPaths = [],
    pathIdentifier = "/amp/",
    relAmpHtmlPattern = "{{canonicalBaseUrl}}{{pathname}}{{pathIdentifier}}"
  }
) => {
  const headComponents = flattenDeep(getHeadComponents());
  const preBodyComponents = getPreBodyComponents();
  const postBodyComponents = getPostBodyComponents();
  const isAmp = pathname && pathname.indexOf(pathIdentifier) > -1;
  if (isAmp) {
    const styles = headComponents.reduce((str, x) => {
      if (x.type === "style") {
        if (x.props.dangerouslySetInnerHTML) {
          str += x.props.dangerouslySetInnerHTML.__html.replace(
            /@charset[^;]*;/g,
            ''
          );
        }
      } else if (x.key && x.key === "TypographyStyle") {
        str = `${x.props.typography.toString()}${str}`;
      }
      return str;
    }, "");
    replaceHeadComponents([
      <script async src="https://cdn.ampproject.org/v0.js" />,
      <style
        amp-boilerplate=""
        dangerouslySetInnerHTML={{ __html: ampBoilerplate }}
      />,
      <noscript>
        <style
          amp-boilerplate=""
          dangerouslySetInnerHTML={{ __html: ampNoscriptBoilerplate }}
        />
      </noscript>,
      <style amp-custom="" dangerouslySetInnerHTML={{ __html: styles }} />,
      ...components.map((component, i) => {
        let attrName = !component.attrName ? 'custom-element' : component.attrName;
        let customAttr = {
            [attrName]: typeof component === 'string' ? component : component.name,
        };
        return (
          <script
            key={`custom-element-${i}`}
            async
            {...customAttr}
            src={`https://cdn.ampproject.org/v0/${
              typeof component === "string" ? component : component.name
            }-${typeof component === "string" ? "0.1" : component.version}.js`}
          />
        )
      }),
      analytics !== undefined ? (
        <script
          async
          custom-element="amp-analytics"
          src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"
        />
      ) : (
        <Fragment />
      ),
      ...headComponents.filter(
        x =>
          x.type !== "style" &&
          (x.type !== "script" || x.props.type === "application/ld+json") &&
          x.key !== "TypographyStyle"
      )
    ]);
    replacePreBodyComponents([
      ...preBodyComponents.filter(x => x.key !== "plugin-google-tagmanager")
    ]);
    replacePostBodyComponents(
      postBodyComponents.filter(x => x.type !== "script")
    );
  } else if (
    (excludedPaths.length > 0 &&
      pathname &&
      excludedPaths.findIndex(_path => new Minimatch(pathname).match(_path)) <
        0) ||
    (includedPaths.length > 0 &&
      pathname &&
      includedPaths.findIndex(_path => minimatch(pathname, _path)) > -1) ||
    (excludedPaths.length === 0 && includedPaths.length === 0)
  ) {
    replaceHeadComponents([
      <link
        rel="amphtml"
        key="gatsby-plugin-amp-amphtml-link"
        href={interpolate(relAmpHtmlPattern, {
          canonicalBaseUrl,
          pathIdentifier,
          pathname
        }).replace(/([^:])(\/\/+)/g, "$1/")}
      />,
      ...headComponents
    ]);
  }
};

export const onRenderBody = (
  { setHeadComponents, setHtmlAttributes, setPreBodyComponents, pathname },
  {
    analytics,
    canonicalBaseUrl,
    pathIdentifier = "/amp/",
    relCanonicalPattern = "{{canonicalBaseUrl}}{{pathname}}",
    useAmpClientIdApi = false
  }
) => {
  const isAmp = pathname && pathname.indexOf(pathIdentifier) > -1;
  if (isAmp) {
    setHtmlAttributes({ amp: "" });
    setHeadComponents([
      <link
        rel="canonical"
        href={interpolate(relCanonicalPattern, {
          canonicalBaseUrl,
          pathname
        })
          .replace(pathIdentifier, "")
          .replace(/([^:])(\/\/+)/g, "$1/")}
      />,
      useAmpClientIdApi ? (
        <meta name="amp-google-client-id-api" content="googleanalytics" />
      ) : (
        <Fragment />
      )
    ]);
    setPreBodyComponents([
      analytics != undefined ? (
        <amp-analytics
          type={analytics.type}
          data-credentials={analytics.dataCredentials}
          config={
            typeof analytics.config === "string" ? analytics.config : undefined
          }
        >
          {typeof analytics.config === "string" ? (
            <Fragment />
          ) : (
            <script
              type="application/json"
              dangerouslySetInnerHTML={{
                __html: interpolate(JSON.stringify(analytics.config), {
                  pathname
                })
              }}
            />
          )}
        </amp-analytics>
      ) : (
        <Fragment />
      )
    ]);
  }
};

export const replaceRenderer = (
  { bodyComponent, replaceBodyHTMLString, setHeadComponents, pathname },
  { pathIdentifier = "/amp/" }
) => {
  const defaults = {
    image: {
      width: 640,
      height: 475,
      layout: "responsive"
    },
    twitter: {
      width: "390",
      height: "330",
      layout: "responsive"
    },
    iframe: {
      width: 640,
      height: 475,
      layout: "responsive"
    }
  };
  const headComponents = [];
  const isAmp = pathname && pathname.indexOf(pathIdentifier) > -1;
  if (isAmp) {
    const bodyHTML = renderToString(bodyComponent);
    const dom = new JSDOM(bodyHTML);
    const document = dom.window.document;

    // convert images to amp-img or amp-anim
    const images = [].slice.call(document.getElementsByTagName("img"));
    images.forEach(image => {
      let ampImage;
      if (image.src && image.src.indexOf(".gif") > -1) {
        ampImage = document.createElement("amp-anim");
        headComponents.push({ name: "amp-anim", version: "0.1" });
      } else {
        ampImage = document.createElement("amp-img");
      }
      const attributes = Object.keys(image.attributes);
      const includedAttributes = attributes.map(key => {
        const attribute = image.attributes[key];
        ampImage.setAttribute(attribute.name, attribute.value);
        return attribute.name;
      });
      Object.keys(defaults.image).forEach(key => {
        if (includedAttributes && includedAttributes.indexOf(key) === -1) {
          ampImage.setAttribute(key, defaults.image[key]);
        }
      });
      image.parentNode.replaceChild(ampImage, image);
    });

    // remove 20px by 20px blur up background image CSS as it's > 1000 bytes - not AMP compatible
    const gatsbyRespBackgroundImages = [].slice.call(
      document.getElementsByClassName("gatsby-resp-image-background-image")
    );
    gatsbyRespBackgroundImages.forEach(gatsbyRespBackgroundImage => {
      gatsbyRespBackgroundImage.style.backgroundImage = "";
    });

    // convert twitter posts to amp-twitter
    const twitterPosts = [].slice.call(
      document.getElementsByClassName("twitter-tweet")
    );
    twitterPosts.forEach(post => {
      headComponents.push({ name: "amp-twitter", version: "0.1" });
      const ampTwitter = document.createElement("amp-twitter");
      const attributes = Object.keys(post.attributes);
      const includedAttributes = attributes.map(key => {
        const attribute = post.attributes[key];
        ampTwitter.setAttribute(attribute.name, attribute.value);
        return attribute.name;
      });
      Object.keys(defaults.twitter).forEach(key => {
        if (includedAttributes && includedAttributes.indexOf(key) === -1) {
          ampTwitter.setAttribute(key, defaults.twitter[key]);
        }
      });
      // grab the last link in the tweet for the twee id
      const links = [].slice.call(post.getElementsByTagName("a"));
      const link = links[links.length - 1];
      const hrefArr = link.href.split("/");
      const id = hrefArr[hrefArr.length - 1].split("?")[0];
      ampTwitter.setAttribute("data-tweetid", id);
      // clone the original blockquote for a placeholder
      const _post = post.cloneNode(true);
      _post.setAttribute("placeholder", "");
      ampTwitter.appendChild(_post);
      post.parentNode.replaceChild(ampTwitter, post);
    });

    // convert iframes to amp-iframe or amp-youtube
    const iframes = [].slice.call(document.getElementsByTagName("iframe"));
    iframes.forEach(iframe => {
      let ampIframe;
      let attributes;
      if (iframe.src && iframe.src.indexOf("youtube.com/embed/") > -1) {
        headComponents.push({ name: "amp-youtube", version: "0.1" });
        ampIframe = document.createElement("amp-youtube");
        const src = iframe.src.split("/");
        const id = src[src.length - 1].split("?")[0];
        ampIframe.setAttribute("data-videoid", id);
        const placeholder = document.createElement("amp-img");
        placeholder.setAttribute(
          "src",
          `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
        );
        placeholder.setAttribute("placeholder", "");
        placeholder.setAttribute("layout", "fill");
        ampIframe.appendChild(placeholder);

        const forbidden = ["allow", "allowfullscreen", "frameborder", "src"];
        attributes = Object.keys(iframe.attributes).filter(key => {
          const attribute = iframe.attributes[key];
          return !forbidden.includes(attribute.name);
        });
      } else {
        headComponents.push({ name: "amp-iframe", version: "0.1" });
        ampIframe = document.createElement("amp-iframe");
        attributes = Object.keys(iframe.attributes);
      }

      const includedAttributes = attributes.map(key => {
        const attribute = iframe.attributes[key];
        ampIframe.setAttribute(attribute.name, attribute.value);
        return attribute.name;
      });
      Object.keys(defaults.iframe).forEach(key => {
        if (includedAttributes && includedAttributes.indexOf(key) === -1) {
          ampIframe.setAttribute(key, defaults.iframe[key]);
        }
      });
      iframe.parentNode.replaceChild(ampIframe, iframe);
    });
    setHeadComponents(
      Array.from(new Set(headComponents)).map((component, i) => (
        <Fragment key={`head-components-${i}`}>
          <script
            async
            custom-element={component.name}
            src={`https://cdn.ampproject.org/v0/${component.name}-${
              component.version
            }.js`}
          />
        </Fragment>
      ))
    );
    replaceBodyHTMLString(document.body.children[0].outerHTML);
  }
};
