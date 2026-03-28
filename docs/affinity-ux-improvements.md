# Affinity Map UX Improvements - Integration Guide

## Overview

This document describes the UX improvements implemented for the Affinity Map workspace, specifically designed for UX designers and their teams.

## New Components Created

### 1. StickyColorPicker (`components/myComponents/figjam/StickyColorPicker.tsx`)

**Purpose**: Enhanced sticky note creation with color preview before placement.

**Features**:
- 11 predefined colors with semantic labels (Insight, Pain Point, Quote, etc.)
- Live preview panel showing how the sticky will look
- Recent colors history (persisted in localStorage)
- Custom color support
- Hover states for quick preview

**Usage in FigJamBoard.tsx**:
```tsx
import { StickyColorPicker, STICKY_COLORS } from "./StickyColorPicker";

const [showStickyPicker, setShowStickyPicker] = useState(false);
const [pendingStickyPosition, setPendingStickyPosition] = useState<Position | null>(null);

const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
  // ... existing pan/hand tool logic
  
  if (state.activeTool === "sticky") {
    const pos = screenToCanvas(e.clientX, e.clientY);
    setPendingStickyPosition({ x: pos.x - 100, y: pos.y - 100 });
    setShowStickyPicker(true);
  }
}, [...]);

// Replace the inline sticky creation logic:
<StickyColorPicker
  isOpen={showStickyPicker}
  onClose={() => {
    setShowStickyPicker(false);
    setPendingStickyPosition(null);
  }}
  onSelectColor={(color) => {
    if (pendingStickyPosition) {
      const stickyId = board.addStickyNote(pendingStickyPosition, color, {...}, currentUserName);
      board.selectElement(stickyId);
    }
    setShowStickyPicker(false);
    setPendingStickyPosition(null);
  }}
/>
```

---

### 2. ContextMenu Components (`components/myComponents/figjam/ContextMenu.tsx`)

**Purpose**: Right-click/context actions for selected elements.

**Components**:
- `ContextMenu` - Base component for any context menu
- `LassoContextMenu` - Actions after lasso selection
- `StickyContextMenu` - Actions on individual sticky notes

**Actions supported**:
- **Grouper en cluster** (Ctrl+G) - Group selected stickies
- **Ajouter une étiquette** - Add cluster label
- **Déplacer vers cluster** - Move to existing cluster
- **Ajouter un commentaire** - Open comment panel
- **Dupliquer** (Ctrl+D) - Duplicate elements
- **Supprimer** (Del) - Delete with confirmation

**Usage in FigJamBoard.tsx**:
```tsx
import { LassoContextMenu, StickyContextMenu } from "./ContextMenu";

const [contextMenu, setContextMenu] = useState<{
  type: "lasso" | "sticky";
  position: { x: number; y: number };
  ids: string[];
} | null>(null);

// Handle right-click on canvas
const handleContextMenu = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  const selected = state.selectedIds;
  if (selected.length > 0) {
    setContextMenu({
      type: selected.length > 1 ? "lasso" : "sticky",
      position: { x: e.clientX, y: e.clientY },
      ids: selected,
    });
  }
}, [state.selectedIds]);

// In render:
<LassoContextMenu
  selectedIds={contextMenu?.ids || []}
  position={contextMenu?.position || { x: 0, y: 0 }}
  isOpen={contextMenu?.type === "lasso"}
  onClose={() => setContextMenu(null)}
  onGroup={() => {
    board.groupSelectedIntoSection();
    setContextMenu(null);
  }}
  onDelete={() => {
    confirmDelete("éléments", contextMenu?.ids.length || 0, () => {
      contextMenu?.ids.forEach(id => board.deleteElement(id));
    });
    setContextMenu(null);
  }}
  onDuplicate={() => {
    contextMenu?.ids.forEach(id => board.duplicateElement(id));
    setContextMenu(null);
  }}
  onComment={() => {
    // Open comment panel
    setContextMenu(null);
  }}
  onLabel={() => {
    // Create label for selection
    setContextMenu(null);
  }}
  onMoveToCluster={() => {
    // Open cluster selector
    setContextMenu(null);
  }}
/>
```

---

### 3. Confirmation Toast Hook (`hooks/useConfirmationToast.tsx`)

**Purpose**: Safe destructive actions with undo capability.

**Features**:
- Single-item deletion with instant undo (5s window)
- Multi-item deletion requires explicit confirmation
- Merge/split confirmations with descriptions
- Undo stack for multiple undoable actions

**Usage in FigJamBoard.tsx**:
```tsx
import { useConfirmationToast, useDestructiveActionConfirm } from "@/hooks/useConfirmationToast";

const { confirmDelete, confirmMerge, confirmSplit, showUndoToast } = useConfirmationToast();
const { confirmDestructive } = useDestructiveActionConfirm();

// For single item deletion:
confirmDelete(itemName, 1, async () => {
  board.deleteElement(id);
});

// For batch deletion:
confirmDelete("éléments", selectedIds.length, async () => {
  selectedIds.forEach(id => board.deleteElement(id));
});

// For merge confirmation:
const groupsToMerge = groups.filter(g => selectedIds.includes(g.id));
confirmMerge(
  groupsToMerge.map(g => g.title),
  async () => {
    // Perform merge
    handlers.handleGroupsMerge(selectedIds, newTitle);
  }
);

// For destructive actions (clear all, reset):
confirmDestructive(
  "Effacer toute la carte ?",
  "Cette action supprimera tous les éléments et ne peut pas être annulée.",
  "Effacer tout",
  async () => {
    // Clear canvas
    Object.keys(state.elements).forEach(id => board.deleteElement(id));
  }
);
```

---

### 4. Activity Notifications (`hooks/useActivityNotifications.ts`, `components/myComponents/figjam/NotificationBadge.tsx`)

**Purpose**: Real-time activity awareness without constant panel toggling.

**Features**:
- Live badge count on Activity button
- Unread notification tracking
- Activity type categorization (create, update, delete, comment, mention)
- Auto-mark as read on panel open

**Usage in AffinityMapWorkspace.tsx**:
```tsx
import { useActivityNotifications } from "@/hooks/useActivityNotifications";
import { ActivityButtonWithBadge } from "@/components/myComponents/figjam/NotificationBadge";

const { unreadCount, markAllAsRead } = useActivityNotifications({
  mapId: affinityMap._id as Id<"affinityMaps">,
  maxNotifications: 50,
});

// Replace activity button in header:
<ActivityButtonWithBadge
  count={unreadCount}
  isActive={showActivityPanel}
  onClick={() => {
    setShowActivityPanel(!showActivityPanel);
    if (!showActivityPanel) {
      markAllAsRead();
    }
  }}
/>
```

---

## Integration Checklist

### Phase 1 Integration Steps

1. **Import new components** in `FigJamBoard.tsx`:
```tsx
import { StickyColorPicker } from "./StickyColorPicker";
import { LassoContextMenu, StickyContextMenu } from "./ContextMenu";
import { useConfirmationToast, useDestructiveActionConfirm } from "@/hooks/useConfirmationToast";
```

2. **Add state variables**:
```tsx
const [showStickyPicker, setShowStickyPicker] = useState(false);
const [pendingStickyPosition, setPendingStickyPosition] = useState<Position | null>(null);
const [contextMenu, setContextMenu] = useState<{...} | null>(null);
```

3. **Initialize confirmation hook**:
```tsx
const { confirmDelete, confirmMerge, confirmSplit, showUndoToast } = useConfirmationToast();
```

4. **Update toolbar sticky creation** to use color picker:
```tsx
// In FigJamToolbar props
onAddSticky={(color?: StickyColor) => {
  setPendingStickyPosition({ x: 200 / state.zoom, y: 200 / state.zoom });
  setShowStickyPicker(true);
}}
```

5. **Add context menu handlers**:
```tsx
// Right-click handler on canvas
<div
  onContextMenu={handleContextMenu}
  // ... existing props
>
```

---

## File Structure After Integration

```
components/myComponents/figjam/
├── FigJamBoard.tsx          (modified)
├── StickyColorPicker.tsx    (new)
├── ContextMenu.tsx          (new)
└── NotificationBadge.tsx    (new)

hooks/
├── useConfirmationToast.tsx  (new)
└── useActivityNotifications.ts (new)

components/myComponents/
├── ActivityPanel.tsx       (existing)
└── AffinityMapWorkspace.tsx (modify Activity button)
```

---

## Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| `S` | Open sticky color picker |
| `Ctrl+G` | Group selected into section |
| `Ctrl+D` | Duplicate selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Del` | Delete with confirmation |
| `F2` | Rename section |
| `Escape` | Clear selection / close menus |
| `Right-click` | Open context menu |

---

## Testing Checklist

- [ ] Sticky color picker opens on S key press
- [ ] Preview shows correct color and text
- [ ] Recent colors persist across sessions
- [ ] Right-click shows context menu with correct options
- [ ] Group action works from context menu
- [ ] Delete shows confirmation for multiple items
- [ ] Single delete has undo option
- [ ] Activity badge shows correct unread count
- [ ] Badge clears when panel is opened
- [ ] All keyboard shortcuts work correctly
