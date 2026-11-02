/** Open the in-app tester Signal fiche from anywhere. */

export const SKRIPTA_OPEN_SIGNAL = "skripta:open-signal";

export type SignalPromptReason = "nudge" | "issue" | "flip" | "manual";

export function openSkriptaSignal(reason: SignalPromptReason = "manual"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SKRIPTA_OPEN_SIGNAL, { detail: { reason } })
  );
}
