# FigJam Components for Next.js

Production-ready FigJam-like components: infinite canvas, sticky notes, sections, and dot voting. Built with **Tailwind CSS** and **React hooks**, zero external dependencies.

---

## File Structure

```
components/figjam/
├── index.ts           ← barrel export (import everything from here)
├── FigJamBoard.tsx    ← main canvas — wires all components together
├── StickyNote.tsx     ← draggable sticky note with color picker
├── Section.tsx        ← resizable section with editable title
├── FigJamToolbar.tsx  ← bottom toolbar (tools + zoom + voting toggle)
└── DotVoting.tsx      ← DotVotingControls, VotingLeaderboard, VotingModeBanner

hooks/
├── useFigJamBoard.ts  ← central state (useReducer) — all board actions
└── useDraggable.ts    ← pointer-based drag for canvas elements

types/
└── figjam.ts          ← all TypeScript types/interfaces
```

---

## Quick Start

### 1. Drop the files into your project

```
your-project/
└── components/
    └── figjam/       ← paste this folder here
└── hooks/            ← paste hooks here
└── types/            ← paste types here
```

### 2. Add a board page

```tsx
// app/board/page.tsx
import { FigJamBoard } from "@/components/figjam";

export default function BoardPage() {
  return (
    <main className="w-screen h-screen">
      <FigJamBoard maxVotesPerUser={5} />
    </main>
  );
}
```

### 3. Make sure Tailwind is configured

```js
// tailwind.config.ts
content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"]
```

---

## Component API

### `<FigJamBoard />`

The all-in-one board. Handles canvas, pan, zoom, keyboard shortcuts, and all element rendering.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxVotesPerUser` | `number` | `5` | Dots available per user in voting mode |
| `onChange` | `(elements) => void` | — | Called on every state change (use to persist) |
| `initialElements` | `Record<string, FigJamElement>` | — | Pre-populate the board |

---

### `<StickyNote />`

| Prop | Type | Description |
|------|------|-------------|
| `note` | `StickyNoteData` | The note data |
| `zoom` | `number` | Canvas zoom (for drag calibration) |
| `isSelected` | `boolean` | Show selection ring |
| `isVotingMode` | `boolean` | Switch to vote-click mode |
| `currentUserId` | `string` | For tracking who voted |
| `votesUsed` | `number` | Votes already used by this user |
| `maxVotes` | `number` | Max votes per user |
| `onSelect` | `(id, multi) => void` | Called on click |
| `onMove` | `(id, pos) => void` | Called on drag end |
| `onUpdate` | `(id, patch) => void` | Content / color change |
| `onDelete` | `(id) => void` | |
| `onDuplicate` | `(id) => void` | |
| `onBringToFront` | `(id) => void` | |
| `onCastVote` | `(id) => void` | |
| `onRemoveVote` | `(id) => void` | |

**Colors available:** `yellow | pink | green | blue | purple | orange | white`

---

### `<Section />`

| Prop | Type | Description |
|------|------|-------------|
| `section` | `SectionData` | Section data incl. `size` and `childIds` |
| `zoom` | `number` | Canvas zoom |
| `isSelected` | `boolean` | |
| `onSelect` | `(id, multi) => void` | |
| `onMove` | `(id, pos) => void` | |
| `onUpdate` | `(id, patch) => void` | Title, color, size |
| `onDelete` | `(id) => void` | |

**Features:** drag to move, corner handle to resize, double-click title to edit, color picker.

---

### `<DotVotingControls />`

Compact toggle button that shows remaining dots when voting mode is on.

| Prop | Type | Description |
|------|------|-------------|
| `isActive` | `boolean` | Voting mode on/off |
| `votesUsed` | `number` | |
| `maxVotes` | `number` | |
| `onToggle` | `() => void` | |
| `onReset` | `() => void` | Reset all votes |

---

### `<VotingLeaderboard />`

Floating panel showing ranked sticky notes by votes, with bar charts and medals.

| Prop | Type | Description |
|------|------|-------------|
| `stickies` | `StickyNoteData[]` | All sticky notes |
| `onClose` | `() => void` | |

---

### `<VotingModeBanner />`

Floating bottom banner during voting mode showing remaining dots.

---

## Hook: `useFigJamBoard()`

Use this if you want to build a custom board without `<FigJamBoard />`.

```tsx
const board = useFigJamBoard();

// Access state
board.state.elements      // Record<string, FigJamElement>
board.state.zoom          // number
board.state.pan           // { x, y }
board.state.activeTool    // ToolType
board.state.votesUsed     // number

// Actions
board.addStickyNote({ x: 100, y: 100 }, "yellow");
board.addSection({ x: 0, y: 0 }, { width: 400, height: 300 });
board.updateElement(id, { content: "New text" });
board.deleteElement(id);
board.duplicateElement(id);
board.selectElement(id, shiftKey);
board.clearSelection();
board.castVote(id);
board.removeVote(id);
board.resetVotes();
board.setZoom(1.5);
board.setPan({ x: 0, y: 0 });
board.setTool("sticky");
board.bringToFront(id);
board.sendToBack(id);
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `H` | Hand (pan) tool |
| `T` | Text tool |
| `Esc` | Back to select, clear selection |
| `Del / Backspace` | Delete selected element |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom & pan |
| Scroll | Zoom centered on cursor |
| Middle-click drag | Pan canvas |

---

## Persisting State

The `onChange` callback fires on every change. Wire it to your backend:

```tsx
<FigJamBoard
  onChange={async (elements) => {
    await fetch("/api/board", {
      method: "POST",
      body: JSON.stringify({ elements }),
    });
  }}
/>
```

Or use `localStorage` for a quick prototype:

```tsx
<FigJamBoard
  onChange={(elements) => localStorage.setItem("board", JSON.stringify(elements))}
  initialElements={JSON.parse(localStorage.getItem("board") ?? "{}")}
/>
```
