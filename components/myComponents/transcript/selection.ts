function clipRangeToNode(range: Range, node: Node): Range | null {
  try {
    const lineRange = document.createRange();
    lineRange.selectNodeContents(node);
    if (!range.intersectsNode(node)) return null;

    const clipped = range.cloneRange();
    if (range.compareBoundaryPoints(Range.START_TO_START, lineRange) < 0) {
      clipped.setStart(lineRange.startContainer, lineRange.startOffset);
    }
    if (range.compareBoundaryPoints(Range.END_TO_END, lineRange) > 0) {
      clipped.setEnd(lineRange.endContainer, lineRange.endOffset);
    }
    return clipped;
  } catch {
    return null;
  }
}

export function selectedTextInLine(lineEl: HTMLElement | null, lineText: string): string {
  if (!lineEl) return "";
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return "";

  const clipped = clipRangeToNode(selection.getRangeAt(0), lineEl);
  const text = clipped?.toString().replace(/\s+/g, " ").trim() ?? "";
  if (text.length >= 2 && lineText.includes(text)) return text;
  if (text.length >= 2 && text.includes(lineText)) return lineText;
  if (text.length >= 2) return text;
  return "";
}

export function pinAnchor(lineEl: HTMLElement | null, fallback: { x: number; y: number }) {
  const selection = window.getSelection();
  if (lineEl && selection && selection.rangeCount > 0) {
    const clipped = clipRangeToNode(selection.getRangeAt(0), lineEl);
    const rect = clipped?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      return { x: rect.left + rect.width / 2, y: rect.top };
    }
    const lineRect = lineEl.getBoundingClientRect();
    return { x: lineRect.left + lineRect.width / 2, y: lineRect.top };
  }
  return fallback;
}
