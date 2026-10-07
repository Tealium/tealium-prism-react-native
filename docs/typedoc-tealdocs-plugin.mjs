import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSX } from "typedoc";

// Wraps the default TypeDoc theme so the output blends into the Tealium Hugo docs site
// (docs.tealium.com). Markup and values mirror the Swift and Kotlin SDK docs builds.
// The `/dist/...`, `/images/...` and `/` URLs are absolute on purpose: the output is
// published to that site, which serves them from its root. They do not resolve locally.

const logo = readFileSync(
  join(import.meta.dirname, "tealium-logo.svg"),
  "utf8"
);

// Light only, like the Swift and Kotlin builds, which have no theme switcher. The stored
// theme must be set first so that TypeDoc's inline theme script and main.js read "light".
//
// TypeDoc wraps its CSS in `@layer typedoc`, and unlayered CSS always beats layered CSS, so a
// plain `app.css` link would override TypeDoc's own styles (heading margins, code pills,
// tables). Importing `app.css` into a layer that is declared before `typedoc` keeps the Hugo
// styles below TypeDoc's. The order has to be declared up front because `typedoc` is only
// declared later, by TypeDoc's own stylesheet. The unlayered custom CSS still beats both.
const head = `
<script>try{localStorage.setItem("tsd-theme","light")}catch(e){}</script>
<link rel="stylesheet" href="https://use.typekit.net/ilp4lxb.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
<style>@layer hugo, typedoc; @import url("/dist/css/app.css") layer(hugo);</style>
`;

// No `sticky-t` on the nav (unlike the Swift and Kotlin builds): TypeDoc's own toolbar is
// the sticky element and the two would overlap.
const bodyBegin = `
<script>
var utag_data = {
    tealium_event : "page_view"
}
</script>
<script>
  (function(a,b,c,d){
    a="//tags.tiqcdn.com/utag/tealium/docs/qa/utag.js";
    b=document;c='script';d=b.createElement(c);d.src=a;d.type='text/java'+c;d.async=true;
    a=b.getElementsByTagName(c)[0];a.parentNode.insertBefore(d,a);
  })();
</script>
<nav class="w-100 bg-primary-color-light bb b--light-gray dn-p" role="navigation">
  <div class="flex flex-wrap items-center justify-start mw9">
    <div class="lh-solid ml0-ns mr0 mr4-l mv3 pl15 dib db-ns relative" style="height: 40px;">
      <a href="/" aria-label="Tealium">${logo}</a>
    </div>
    <ul class="list ma0 pa0 dn dib-ns">
      <li class="f5 dib mr4">
        <a href="/help/" class="dim link mid-gray">Help</a>
      </li>
    </ul>
  </div>
</nav>
`;

const sidebarBegin = `
<ul class="list pa0 mt0 mb1">
  <li class="w-100 fw4 f5 text-color-primary pv1 pl2"><a href="/early-access/mobile/quick-start/" class="w-100 link text-color-primary hover-primary-color pv2 pl0 pr2"><img src="/images/icons/icon-arrow-left.svg" height="10" width="16" class="di v-mid pr1">Back</a></li>
</ul>
<ul class="list pa0">
  <li data-level="1" class="relative w-100 fw8 f4 mv2 text-color-primary pv1 ind2">
    <span class="pb2">Tealium Prism React Native SDK Reference</span>
  </li>
</ul>
`;

const raw = (html) => JSX.createElement(JSX.Raw, { html });

export function load(app) {
  app.renderer.hooks.on("head.begin", () => raw(head));
  app.renderer.hooks.on("body.begin", () => raw(bodyBegin));
  app.renderer.hooks.on("sidebar.begin", () => raw(sidebarBegin));
  app.renderer.hooks.on("footer.begin", () =>
    raw(
      `<p>© ${new Date().getFullYear()} <a class="link" href="https://www.tealium.com" target="_blank" rel="external noopener">Tealium</a>. All rights reserved.</p>`
    )
  );
}
