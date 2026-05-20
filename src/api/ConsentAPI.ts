/**
 * ConsentAPI - Interface for Tealium consent management
 *
 * Mirrors the native CMPAdapter/CmpAdapter pattern from Swift/Kotlin SDKs.
 * A bridge CMP adapter is created on the native side that receives consent
 * decisions pushed from JavaScript.
 *
 * Requires `cmpAdapter` to be provided in the TealiumConfig passed to `Tealium.create()`.
 */

import { NativeEventEmitter } from 'react-native';
import NativeTealiumPrism from '../NativeTealiumPrismReactNative';
import type {
  ConsentDecision,
  ConsentDecisionType,
  Disposable,
} from '../types';
import { TealiumEvents } from '../types';

/**
 * Callback for consent decision change events.
 */
export type ConsentDecisionChangedCallback = (
  decision: ConsentDecision | null
) => void;

// Native event payload emitted via NativeEventEmitter. Shape must match what
// TealiumPrismBridge+Consent.swift / ConsentDelegate.kt sendEvent.
interface ConsentDecisionChangedEvent {
  decision: ConsentDecision | null;
}

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
  private eventEmitter: NativeEventEmitter;

  constructor(eventEmitter: NativeEventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Set the consent decision.
   *
   * This pushes a consent decision to the bridge-owned `BridgeCMPAdapter`,
   * which exposes it via the native `CMPAdapter.consentDecision` observable
   * that the SDK consent pipeline subscribes to. Native CMP adapters do not
   * expose a public setter — `setDecision` is a bridge-only convenience for
   * RN apps that own consent UI in JS.
   *
   * @param decisionType - Type of consent: 'implicit' or 'explicit'
   * @param purposes - Array of consented purpose IDs (e.g., ['analytics', 'marketing'])
   * @returns Promise rejecting with `CONSENT_NOT_ENABLED` if `cmpAdapter` was
   *   not provided in the config; rejecting with `INVALID_DECISION_TYPE` if
   *   `decisionType` is not parseable.
   *
   * @example
   * ```typescript
   * // Explicit consent for all purposes
   * await Tealium.consent.setDecision('explicit', ['analytics', 'marketing', 'personalization']);
   *
   * // Implicit consent (e.g., app launch in implied-consent jurisdictions)
   * await Tealium.consent.setDecision('implicit', ['analytics']);
   * ```
   */
  setDecision(
    decisionType: ConsentDecisionType,
    purposes: string[]
  ): Promise<void> {
    return NativeTealiumPrism.consentSetDecision(decisionType, purposes);
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
    const result = await NativeTealiumPrism.consentGetDecision();
    return result as ConsentDecision | null;
  }

  /**
   * Reset the consent decision (revoke consent).
   *
   * Clears the current consent decision on the native bridge adapter.
   * After reset, the SDK will queue dispatches until a new decision is provided.
   *
   * @returns Promise rejecting with `CONSENT_NOT_ENABLED` if `cmpAdapter` was
   *   not provided in the config.
   *
   * @example
   * ```typescript
   * await Tealium.consent.reset();
   * ```
   */
  reset(): Promise<void> {
    return NativeTealiumPrism.consentReset();
  }

  /**
   * Get all purposes the CMP adapter knows about.
   *
   * Mirrors native: `CMPAdapter.allPurposes` / `CmpAdapter.allPurposes`.
   *
   * Useful when building consent UI to enumerate which purposes the user
   * can opt into. Returns `null` when consent is not enabled (no
   * `cmpAdapter` in config) or when no `allPurposes` was supplied.
   *
   * @example
   * ```typescript
   * const purposes = await Tealium.consent.getAllPurposes();
   * purposes?.forEach((p) => console.log(p));
   * ```
   */
  async getAllPurposes(): Promise<string[] | null> {
    return NativeTealiumPrism.consentGetAllPurposes();
  }

  /**
   * Subscribe to consent decision change events. Called whenever the
   * underlying CMP adapter publishes a new decision (including `null` after
   * `reset()` clears any default).
   *
   * Mirrors native: `CMPAdapter.consentDecision` observable subscription.
   *
   * Multiple subscribers are supported — every JS callback receives every
   * event. The native subscription is created on the first subscribe and
   * disposed when the last subscriber disposes.
   *
   * @param observer - Function called with the new decision or `null`
   * @returns Disposable — call dispose() to unsubscribe (idempotent)
   *
   * @example
   * ```typescript
   * const sub = Tealium.consent.onDecisionChanged((decision) => {
   *   console.log('Consent decision changed:', decision);
   * });
   * sub.dispose();
   * ```
   */
  onDecisionChanged(observer: ConsentDecisionChangedCallback): Disposable {
    const eventName = TealiumEvents.CONSENT_DECISION_CHANGED;
    if (this.eventEmitter.listenerCount(eventName) === 0) {
      NativeTealiumPrism.consentOnDecisionChangedSubscribe();
    }

    const sub = this.eventEmitter.addListener(eventName, (raw: unknown) => {
      observer((raw as ConsentDecisionChangedEvent).decision);
    });

    let disposed = false;
    return {
      get isDisposed() {
        return disposed;
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        sub.remove();
        if (this.eventEmitter.listenerCount(eventName) === 0) {
          NativeTealiumPrism.consentOnDecisionChangedDispose();
        }
      },
    };
  }

  /**
   * @internal
   * Force teardown of native subscription on shutdown.
   */
  _forceDisposeAll(): void {
    const eventName = TealiumEvents.CONSENT_DECISION_CHANGED;
    if (this.eventEmitter.listenerCount(eventName) > 0) {
      this.eventEmitter.removeAllListeners(eventName);
    }
    NativeTealiumPrism.consentOnDecisionChangedDispose();
  }
}
