import NativeTealiumPrismReactNative from './NativeTealiumPrismReactNative';

/**
 * Whether the native Prism wrapper module is linked and resolvable.
 *
 * PR0 exposes no Prism functionality yet; this flag only lets the example app
 * (and consumers) confirm the TurboModule was bundled and registered on the
 * current platform. Returns `false` in JS-only environments (e.g. Jest, web).
 *
 * TODO: remove this method once PR1+ exposes actual functionality that can be tested against
 */
export function isWrapperLoaded(): boolean {
  return NativeTealiumPrismReactNative != null;
}
