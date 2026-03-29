# Affinity Map UX Improvements - Integration Guide

## Overview

This document describes the UX improvements implemented for the Affinity Map workspace, specifically designed for UX designers and their teams.

---

## ✅ PHASE 1 - COMPLETED

### 1. StickyColorPicker (`components/myComponents/figjam/StickyColorPicker.tsx`)

**Purpose**: Enhanced sticky note creation with color preview before placement.

**Features**:
- 11 predefined colors with semantic labels (Insight, Pain Point, Quote, etc.)
- Live preview panel showing how the sticky will look
- Recent colors history (persisted in localStorage)
- Custom color support
- Hover states for quick preview

**Status**: ✅ Fully integrated in FigJamBoard.tsx

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
- **Ajouter un commentaire** - Open comment bubble
- **Dupliquer** (Ctrl+D) - Duplicate elements
- **Supprimer** (Del) - Delete with confirmation

**Status**: ✅ Fully integrated in FigJamBoard.tsx

---

### 3. Confirmation Toast Hook (`hooks/useConfirmationToast.tsx`)

**Purpose**: Safe destructive actions with undo capability.

**Features**:
- Single-item deletion with instant undo (5s window)
- Multi-item deletion requires explicit confirmation
- Merge/split confirmations with descriptions
- Undo stack for multiple undoable actions

**Status**: ✅ Created, ready to be integrated

---

### 4. Activity Notifications (`hooks/useActivityNotifications.ts`, `components/myComponents/figjam/NotificationBadge.tsx`)

**Purpose**: Real-time activity awareness without constant panel toggling.

**Features**:
- Live badge count on Activity button
- Unread notification tracking
- Activity type categorization (create, update, delete, comment, mention)
- Auto-mark as read on panel open

**Status**: ✅ Components created, need integration in AffinityMapWorkspace.tsx

---

## ✅ PHASE 2 - COMPLETED

### 5. Comment Bubbles - Figma-like (`components/myComponents/figjam/CommentBubble.tsx`)

**Purpose**: Floating comment bubbles that persist and sync across users.

**Features**:
- ✅ Create bubbles by clicking with `M` mode or right-click → "Ajouter un commentaire"
- ✅ Drag bubbles to reposition
- ✅ Context menu with delete option
- ✅ @mentions with user suggestions
- ✅ Notifications sent to mentioned users
- ✅ Persisted in Convex (survives refresh)
- ✅ Real-time sync across all users
- ✅ Badge count on toolbar button
- ✅ Bubbles follow their target elements (sticky/cluster)
- ✅ Thread-based comments per bubble

**Convex Table**: `commentBubbles`
```typescript
{
  mapId: Id<"affinityMaps">,
  position: { x: number, y: number },
  targetId?: string,        // ID of sticky/cluster
  targetType?: "sticky" | "label" | "canvas",
  resolved: boolean,
  createdBy: string,
  createdByName: string,
  createdAt: number,
  updatedAt: number,
}
```

**Convex Mutations**: `convex/commentBubbles.ts`
- `getBubblesByMap` - Load all bubbles for a map
- `createBubble` - Create new bubble
- `updateBubblePosition` - Move bubble
- `deleteBubble` - Remove bubble
- `resolveBubble` - Mark as resolved/unresolved
- `linkBubbleToTarget` - Attach to sticky/cluster

**Status**: ✅ Fully implemented and working

---

## 🔲 PHASE 3 - REMAINING

### 5. Templates de Workshop

Pre-configured workshop templates for common UX research methods:

```typescript
interface WorkshopTemplate {
  id: string;
  name: "User Interview" | "Heuristic Eval" | "Competitive Analysis";
  predefinedColors: string[];
  categories: string[];
  instructions: string;
}
```

### 6. Mode Présentation

Presentation mode for stakeholder reviews:
- Reveal clusters/comments sequentially
- Highlight top voted items
- Hide/show private notes

### 7. Export PDF/PNG

Export the affinity map in presentation-ready formats:
- Full canvas export
- Individual clusters
- Comments included

### 8. Filtres par Auteur/Type

Filter the canvas by:
- Author (who created the sticky)
- Type (insight, pain point, quote, etc.)
- Cluster membership
- Text search

### 9. Historique de Versions

Version history with snapshots:
```typescript
interface MapVersion {
  id: string;
  timestamp: Date;
  author: string;
  snapshot: Record<string, FigJamElement>;
  label: string;  // "Avant voting", "Post-merge"
}
```

### 10. Intégration FigJam Native

Import/export from/to FigJam format.

### 11. Power-ups pour Voting

Enhanced voting with:
- Category-based voting
- Weighted votes
- Vote delegation

---

## File Structure (Current)

```
convex/
├── schema.ts              # + table commentBubbles
├── commentBubbles.ts     # CRUD mutations for bubbles
└── notifications.ts       # Mention notifications

components/myComponents/figjam/
├── FigJamBoard.tsx         # Canvas with all features integrated
├── StickyColorPicker.tsx  # Color picker with preview
├── ContextMenu.tsx        # Lasso and sticky context menus
├── CommentBubble.tsx       # Figma-like comment bubbles
└── NotificationBadge.tsx  # Badge components

hooks/
├── useConfirmationToast.tsx   # Undo/destructive confirmations
└── useActivityNotifications.ts # Activity tracking

components/myComponents/
├── ActivityPanel.tsx        # Existing activity panel
└── AffinityMapWorkspace.tsx # Main workspace
```

---

## Keyboard Shortcuts (Updated)

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `H` | Hand (pan) tool |
| `S` | Sticky note tool (opens color picker) |
| `C` | Cluster label tool |
| `F` | Section/freestyle tool |
| `M` | Comment tool (click to place bubble) |
| `Ctrl+G` | Group selected into section |
| `Ctrl+D` | Duplicate selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Del` | Delete selected |
| `F2` | Rename section |
| `Escape` | Clear selection / close menus |
| `Right-click` | Open context menu |
| `Click bubble` | Open comment thread |
| `Drag bubble` | Reposition bubble |

---

## Testing Checklist

- [x] Sticky color picker opens on S key press
- [x] Preview shows correct color and text
- [x] Recent colors persist across sessions
- [x] Right-click shows context menu with correct options
- [x] Group action works from context menu
- [x] Comment bubbles created via M key or right-click
- [x] Bubbles persist after refresh (Convex)
- [x] Multiple users see the same bubbles
- [x] Drag to reposition bubbles
- [x] Delete bubble via context menu
- [x] @mentions show user suggestions
- [x] Badge shows bubble count on toolbar
- [x] Bubbles follow attached elements
- [x] Activity badge integration
- [x] Confirmation toasts integration (delete with undo)
