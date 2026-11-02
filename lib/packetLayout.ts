export const SLIP_MIN_WIDTH = 176;
export const SLIP_GAP = 8;
export const PACKET_PAD = 10;
export const PACKET_HEADER = 32;
export const PACKET_MAX_COLS = 3;
export const SLIP_MIN_HEIGHT = 88;
export const SLIP_ROW = 160;
export const PACKET_EMPTY = { width: 280, height: 188 };
export const SLIP_PREFERRED = 220;

export function packetHugWidth(slipCount: number): number {
  const cols = Math.min(PACKET_MAX_COLS, Math.max(1, slipCount));
  return PACKET_PAD * 2 + cols * SLIP_PREFERRED + Math.max(0, cols - 1) * SLIP_GAP;
}

export function packetColumns(frameWidth: number, slipCount: number): number {
  const inner = Math.max(SLIP_MIN_WIDTH, frameWidth - PACKET_PAD * 2);
  const maxFit = Math.max(
    1,
    Math.floor((inner + SLIP_GAP) / (SLIP_MIN_WIDTH + SLIP_GAP))
  );
  const wanted = Math.max(1, slipCount);
  return Math.min(PACKET_MAX_COLS, maxFit, wanted);
}

export function packetHeight(slipCount: number, cols: number): number {
  const rows = Math.max(1, Math.ceil(Math.max(slipCount, 1) / Math.max(cols, 1)));
  return (
    PACKET_HEADER +
    PACKET_PAD +
    rows * SLIP_ROW +
    Math.max(0, rows - 1) * SLIP_GAP +
    PACKET_PAD
  );
}

export function packetSlipPosition(
  frame: { x: number; y: number; width: number },
  index: number,
  cols: number
): { x: number; y: number } {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const inner = frame.width - PACKET_PAD * 2;
  const colWidth = (inner - SLIP_GAP * (cols - 1)) / cols;
  return {
    x: frame.x + PACKET_PAD + col * (colWidth + SLIP_GAP),
    y: frame.y + PACKET_HEADER + PACKET_PAD + row * (SLIP_ROW + SLIP_GAP),
  };
}

export const PACKET_PLACE_GAP = 56;

export interface PacketRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function packetSlotStride(): { width: number; height: number } {
  return {
    width: packetHugWidth(PACKET_MAX_COLS) + PACKET_PLACE_GAP,
    height: packetHeight(6, PACKET_MAX_COLS) + PACKET_PLACE_GAP,
  };
}

function rectsOverlap(a: PacketRect, b: PacketRect, gap: number): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

export function findPacketSlot(
  occupied: PacketRect[],
  size: { width: number; height: number },
  origin: { x: number; y: number },
  columns = 2
): { x: number; y: number } {
  const stride = packetSlotStride();
  const candidateSize = {
    width: Math.max(size.width, 1),
    height: Math.max(size.height, 1),
  };
  const cols = Math.max(1, columns);

  for (let i = 0; i < 80; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const candidate: PacketRect = {
      x: origin.x + col * stride.width,
      y: origin.y + row * stride.height,
      width: candidateSize.width,
      height: candidateSize.height,
    };
    const hits = occupied.some((rect) =>
      rectsOverlap(candidate, rect, PACKET_PLACE_GAP / 2)
    );
    if (!hits) return { x: candidate.x, y: candidate.y };
  }

  const maxY = occupied.reduce(
    (max, rect) => Math.max(max, rect.y + rect.height),
    origin.y
  );
  return { x: origin.x, y: maxY + PACKET_PLACE_GAP };
}
