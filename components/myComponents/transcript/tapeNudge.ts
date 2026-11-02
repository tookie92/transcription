const MAX_NUDGE_PX = 18;
const SNAP_MS = 200;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export function dampNudgeX(dx: number, max = MAX_NUDGE_PX): number {
  return max * Math.tanh(dx / (max * 2.2));
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setTapeNudge(el: HTMLElement, x: number): void {
  el.style.willChange = "transform";
  el.style.transform = `translateX(${x}px)`;
}

export function snapTapeNudge(el: HTMLElement, fromX: number): void {
  el.getAnimations().forEach((animation) => animation.cancel());

  if (prefersReducedMotion() || Math.abs(fromX) < 0.5) {
    el.style.transform = "";
    return;
  }

  const overshoot = -fromX * 0.14;
  const animation = el.animate(
    [
      { transform: `translateX(${fromX}px)` },
      { transform: `translateX(${overshoot}px)`, offset: 0.72 },
      { transform: "translateX(0px)" },
    ],
    {
      duration: SNAP_MS,
      easing: EASE_OUT,
      fill: "forwards",
    }
  );

  animation.finished
    .then(() => {
      el.style.transform = "";
      el.style.willChange = "";
      animation.cancel();
    })
    .catch(() => {
      el.style.transform = "";
      el.style.willChange = "";
    });
}
