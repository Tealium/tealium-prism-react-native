/**
 * ConsentAPI - Interface for consent management
 *
 * Provides methods for managing user consent status and categories.
 */

import NativeTealiumPrism from '../NativeTealiumPrismReactNative';
import type { ConsentStatus, ConsentCategory } from '../types';

/**
 * ConsentAPI provides methods for managing user consent.
 *
 * Use this to set and retrieve the user's consent status and
 * the specific categories they have consented to.
 *
 * @example
 * ```typescript
 * // Set consent status
 * Tealium.consent.setStatus('consented');
 *
 * // Set specific categories
 * Tealium.consent.setCategories(['analytics', 'personalization']);
 *
 * // Get current status
 * const status = await Tealium.consent.getStatus();
 * ```
 */
export class ConsentAPI {
  /**
   * Set the user's consent status.
   *
   * @param status - Consent status: 'consented', 'notConsented', or 'unknown'
   *
   * @example
   * ```typescript
   * Tealium.consent.setStatus('consented');
   * ```
   */
  setStatus(status: ConsentStatus): void {
    NativeTealiumPrism.setConsentStatus(status);
  }

  /**
   * Get the current consent status.
   *
   * @returns Promise resolving to the consent status
   */
  async getStatus(): Promise<ConsentStatus> {
    const status = await NativeTealiumPrism.getConsentStatus();
    return status as ConsentStatus;
  }

  /**
   * Set the consented categories.
   *
   * @param categories - Array of consent category strings
   *
   * @example
   * ```typescript
   * Tealium.consent.setCategories(['analytics', 'personalization', 'email']);
   * ```
   */
  setCategories(categories: ConsentCategory[]): void {
    NativeTealiumPrism.setConsentCategories(categories);
  }

  /**
   * Get the current consent categories.
   *
   * @returns Promise resolving to array of consent category strings
   */
  async getCategories(): Promise<ConsentCategory[]> {
    const categories = await NativeTealiumPrism.getConsentCategories();
    return categories as ConsentCategory[];
  }
}
