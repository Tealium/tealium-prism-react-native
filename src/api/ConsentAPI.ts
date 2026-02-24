/**
 * ConsentAPI - Interface for Tealium consent management
 *
 * Mirrors the native CMPAdapter/CmpAdapter pattern from Swift/Kotlin SDKs.
 * A bridge CMP adapter is created on the native side that receives consent
 * decisions pushed from JavaScript.
 *
 * Requires `consentEnabled: true` in the TealiumConfig passed to `Tealium.create()`.
 */

import NativeTealiumPrism from '../NativeTealiumPrismReactNative';
import type { ConsentDecision, ConsentDecisionType } from '../types';

/**
 * ConsentAPI provides methods for managing consent decisions from JavaScript.
 *
 * When consent is enabled, the native SDK creates a bridge CMP adapter that
 * receives decisions from this API. The SDK then applies consent filtering
 * to all dispatches based on the current decision.
 *
 * @example
 * ```typescript
 * // Grant explicit consent for specific purposes
 * Tealium.consent.setDecision('explicit', ['analytics', 'marketing']);
 *
 * // Check current consent state
 * const decision = await Tealium.consent.getDecision();
 * console.log(decision?.purposes); // ['analytics', 'marketing']
 *
 * // Revoke consent
 * Tealium.consent.reset();
 * ```
 */
export class ConsentAPI {
  /**
   * Set the consent decision.
   *
   * This pushes a consent decision to the native bridge CMP adapter,
   * which the SDK uses to filter dispatches and apply consent metadata.
   *
   * Mirrors native: `CMPAdapter.consentDecision` observable update
   *
   * @param decisionType - Type of consent: 'implicit' or 'explicit'
   * @param purposes - Array of consented purpose IDs (e.g., ['analytics', 'marketing'])
   *
   * @example
   * ```typescript
   * // Explicit consent for all purposes
   * Tealium.consent.setDecision('explicit', ['analytics', 'marketing', 'personalization']);
   *
   * // Implicit consent (e.g., app launch in implied-consent jurisdictions)
   * Tealium.consent.setDecision('implicit', ['analytics']);
   * ```
   */
  setDecision(decisionType: ConsentDecisionType, purposes: string[]): void {
    NativeTealiumPrism.setConsentDecision(decisionType, purposes);
  }

  /**
   * Get the current consent decision.
   *
   * Returns null if no decision has been set or if consent has been reset.
   *
   * @returns Promise resolving to the current ConsentDecision or null
   *
   * @example
   * ```typescript
   * const decision = await Tealium.consent.getDecision();
   * if (decision) {
   *   console.log(`Type: ${decision.decisionType}`);
   *   console.log(`Purposes: ${decision.purposes.join(', ')}`);
   * }
   * ```
   */
  async getDecision(): Promise<ConsentDecision | null> {
    const result = await NativeTealiumPrism.getConsentDecision();
    return result as ConsentDecision | null;
  }

  /**
   * Reset the consent decision (revoke consent).
   *
   * Clears the current consent decision on the native bridge adapter.
   * After reset, the SDK will queue dispatches until a new decision is provided.
   *
   * @example
   * ```typescript
   * Tealium.consent.reset();
   * ```
   */
  reset(): void {
    NativeTealiumPrism.resetConsentDecision();
  }
}
