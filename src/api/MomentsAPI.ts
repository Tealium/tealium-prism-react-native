/**
 * MomentsAPI - Interface for Tealium Moments API
 *
 * Provides access to real-time visitor profile data from Tealium's
 * personalization platform.
 */

import NativeTealiumPrism from '../NativeTealiumPrismReactNative';
import type { EngineResponse } from '../types';

/**
 * MomentsAPIHandler provides methods for fetching visitor profile data.
 *
 * Moments API returns real-time personalization data including audiences,
 * badges, and visitor attributes.
 *
 * @example
 * ```typescript
 * const response = await Tealium.momentsAPI.fetchEngineResponse('my-engine-id');
 * if (response) {
 *   console.log('Audiences:', response.audiences);
 *   console.log('Badges:', response.badges);
 * }
 * ```
 */
export class MomentsAPIHandler {
  /**
   * Fetch the engine response for the current visitor.
   *
   * Returns personalization data including audiences, badges, and attributes.
   *
   * @param engineId - The engine ID to fetch data from
   * @returns Promise resolving to EngineResponse or null if not available
   *
   * @example
   * ```typescript
   * const response = await Tealium.momentsAPI.fetchEngineResponse('my-engine');
   *
   * if (response?.audiences?.includes('high_value_customer')) {
   *   // Show premium content
   * }
   * ```
   */
  async fetchEngineResponse(engineId: string): Promise<EngineResponse | null> {
    const response = await NativeTealiumPrism.fetchEngineResponse(engineId);
    return response as EngineResponse | null;
  }
}
