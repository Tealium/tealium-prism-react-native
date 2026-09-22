import { useMemo } from "react";
import { type TrackResult } from "@tealium/prism-react-native";
import Toast, { type ToastNotice } from "./Toast";

type Props = {
  /** The most recent track result to surface, or null to show nothing. */
  result: TrackResult | null;
  /** Called once the toast has faded out so the owner can clear its result. */
  onDismiss: () => void;
  /** Label used when logging the payload to the dev console. */
  logTag?: string;
};

/**
 * A tappable toast that surfaces a {@link TrackResult}. Tapping it opens a modal
 * with the full dispatch payload (also logged to the dev console); it auto-hides
 * after 5s or can be dismissed manually. Shared by screens that track events so
 * they present results identically.
 */
export default function TrackResultToast({
  result,
  onDismiss,
  logTag = "TrackResultToast",
}: Props) {
  // Memoized on `result` so the toast's effects (fade-in, auto-hide timer) key
  // on the result's identity, not on a fresh object built every render.
  const notice = useMemo<ToastNotice | null>(
    () =>
      result
        ? {
            kind: "success",
            title: "Track Result",
            lines: [`Status: ${result.status}`, `Info: ${result.info}`],
            payload: result.payload,
            payloadTitle: "Dispatch Payload",
          }
        : null,
    [result],
  );

  return <Toast notice={notice} onDismiss={onDismiss} logTag={logTag} />;
}
