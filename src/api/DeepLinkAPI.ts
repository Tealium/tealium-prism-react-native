/**
 * DeepLinkAPI - Interface for handling deep links
 *
 * Mirrors the native DeepLinkHandler API from Swift/Kotlin SDKs.
 * Handles attribution tracking and trace management from deep links.
 */

import NativeTealiumPrism from '../NativeTealiumPrismReactNative';

/**
 * DeepLinkAPI provides methods for handling incoming deep links.
 *
 * The handler is responsible for tracking incoming deep links,
 * managing attribution, and handling trace parameters when present in the URL.
 *
 * @example
 * ```typescript
 * // Handle a deep link
 * const handled = await Tealium.deepLink.handle('myapp://product/123');
 *
 * // Handle with referrer
 * const handled = await Tealium.deepLink.handle(
 *   'myapp://product/123',
 *   'https://referrer.com'
 * );
 * ```
 */
export class DeepLinkAPI {
  /**
   * Handle a deep link URL for attribution and trace management.
   *
   * Use this when your app receives a deep link that should be tracked by Tealium.
   * The handler will extract attribution parameters and trace IDs if present.
   *
   * @param url - The deep link URL to handle
   * @param referrer - Optional referrer URL indicating the source of the deep link
   * @returns Promise resolving to true if handled successfully. Rejects with
   *   `NOT_INITIALIZED` if Tealium is not yet initialized.
   *
   * @example
   * ```typescript
   * // In your deep link handler
   * Linking.addEventListener('url', async (event) => {
   *   await Tealium.deepLink.handle(event.url);
   * });
   * ```
   */
  handle(url: string, referrer?: string): Promise<boolean> {
    return NativeTealiumPrism.deepLinkHandle(url, referrer ?? null);
  }
}
