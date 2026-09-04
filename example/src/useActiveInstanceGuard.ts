import { useCallback, useEffect, useRef } from "react";
import { type Tealium } from "@tealium/prism-react-native";

/**
 * Guards async callbacks against active-instance changes.
 *
 * A `track()` (or any instance-scoped promise) can resolve after the user has
 * switched to a different instance, at which point applying its result would
 * show data for the wrong instance. Given the currently-active instance, this
 * hook returns a `guard` wrapper: it captures the instance id when you build
 * the wrapper (i.e. at call time) and only invokes the wrapped callback if that
 * same instance is still active when the promise settles.
 *
 * @example
 * const guard = useActiveInstanceGuard(activeInstance);
 * activeInstance
 *   .track("my_event", "event")
 *   .then(guard((result) => setLastResult(result)))
 *   .catch(guard((e) => setError(String(e))));
 */
export function useActiveInstanceGuard(activeInstance: Tealium | null) {
  const activeInstanceId = activeInstance?.instanceId;
  const activeInstanceIdRef = useRef(activeInstanceId);
  useEffect(() => {
    activeInstanceIdRef.current = activeInstanceId;
  }, [activeInstanceId]);

  return useCallback(
    <A extends unknown[]>(callback: (...args: A) => void) => {
      // Snapshot the active instance now; the wrapper below runs later (when a
      // promise settles) and no-ops if the active instance changed meanwhile.
      const sentInstanceId = activeInstanceId;
      return (...args: A) => {
        if (activeInstanceIdRef.current === sentInstanceId) {
          callback(...args);
        }
      };
    },
    [activeInstanceId],
  );
}
