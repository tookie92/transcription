# AGENTS.md - Coding Guidelines for Transcribe

## Build, Lint, and Test Commands

```bash
# Development
npm run dev              # Start Next.js dev server

# Build
npm run build            # Production build
npm run start            # Start production server

# Linting
npm run lint             # Run ESLint

# Running a single test
# Note: This project doesn't have a test framework configured yet.
# To add tests, install Jest/Vitest and add test scripts to package.json.
```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - All TypeScript code must be type-safe
- Use explicit types for function parameters and return types when not inferrable
- Use `interface` for object shapes, `type` for unions/aliases
- Avoid `any` - use `unknown` when type is truly unknown
- Use `null` instead of `undefined` for optional values that need explicit handling

### Naming Conventions

- **Files**: PascalCase for components (`AffinityCanvas.tsx`), camelCase for hooks (`useCanvasShortcuts.ts`), camelCase for utilities
- **Components**: PascalCase (`function AffinityCanvas()`)
- **Hooks**: camelCase starting with `use` (`useHistory`, `usePresence`)
- **Interfaces/Types**: PascalCase (`AffinityGroup`, `Insight`)
- **Constants**: SCREAMING_SNAKE_CASE for config values, camelCase for regular constants
- **Variables**: camelCase

### Imports

- Use absolute imports with `@/` prefix (configured in tsconfig.json)
- Order imports groups:
  1. External libraries (react, next, etc.)
  2. Internal components
  3. Custom hooks
  4. Types
  5. Utils
- Example:
  ```typescript
  import { useRef, useEffect, useState } from "react";
  import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
  import AffinityGroup from "./AffinityGroup";
  import { Button } from "../ui/button";
  import { useCanvasShortcuts } from "@/hooks/useCanvasShortcuts";
  import { useHistory } from "@/hooks/useHistory";
  import { ActivePanel, AffinityGroup as AffinityGroupType, Insight } from "@/types";
  import { toast } from "sonner";
  ```

### React/Next.js Patterns

- Use `"use client"` directive for client-side components
- Prefer function components with hooks over class components
- Use `useCallback` for event handlers passed to child components
- Use `useMemo` for expensive computations
- Destructure props in component signatures
- Keep components focused - extract large logic into custom hooks

### UI Components (Radix UI + Tailwind)

- Use Radix UI primitives for complex interactive components
- Use Tailwind CSS for styling (Tailwind v4 configured)
- Use `class-variance-authority` (cva) for component variants
- Use `clsx` and `tailwind-merge` (cn utility) for conditional classes

### Dark Mode / Theme Support

This project uses CSS variables with shadcn/ui theming system. Always use theme-aware classes:

- **Backgrounds**: Use `bg-background` or `bg-card` instead of `bg-white` or `bg-gray-50`
- **Text**: Use `text-foreground` for primary text, `text-muted-foreground` for secondary text
- **Borders**: Use `border-border` instead of `border-gray-200`
- **Hover states**: Use `hover:bg-accent` instead of `hover:bg-gray-50`
- **Primary color**: Use `bg-primary`, `text-primary`, `border-primary` (green theme)
- **Avoid hardcoded colors**: Never use `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*` directly

Example of theme-aware styling:
```tsx
// ❌ Wrong - hardcoded colors don't work in dark mode
<div className="bg-white text-gray-600 border-gray-200">

// ✅ Correct - uses CSS variables
<div className="bg-card text-foreground border-border">
```

### Error Handling

- Use `try/catch` for async operations
- Show user-friendly error messages with `toast.error()` from sonner
- Log errors appropriately for debugging
- Handle edge cases explicitly rather than ignoring them

### State Management

- Use React useState for local component state
- Use Zustand for global client state
- Use Convex for server state (queries/mutations)
- Keep state as close to where it's used as possible

### Keyboard Accessibility

- Always handle keyboard events appropriately
- Use proper focus management for interactive elements
- Implement keyboard shortcuts following conventions (Escape to close, etc.)

### Performance

- Use `React.memo` for expensive components
- Use `useMemo` and `useCallback` judiciously
- Lazy load routes with `next/dynamic`
- Optimize images with `next/image`

### File Organization

```
/app                 # Next.js App Router pages
/components          # React components
  /myComponents      # Feature-specific components
  /ui                # Reusable UI components
  /canvas            # Canvas-related sub-components
/hooks               # Custom React hooks
/lib                 # Utility functions
/types               # TypeScript type definitions
/convex              # Convex backend (database, queries, mutations)
```

### Formatting

- Use Prettier-like formatting (2 spaces for indentation)
- Maximum line length: ~100 characters (soft limit)
- Use semicolons in JavaScript
- Prefer explicit returns over implicit (early returns are fine)

### Convex (Backend)

- Use Convex queries for data fetching
- Use mutations for data modifications
- Follow Convex naming conventions: `api.functions.functionName`
- Use `Id<"tableName">` for typed document IDs

### Git Conventions

- Write descriptive commit messages
- Use feature branches for new features
- Run `npm run lint` before committing
- Don't commit secrets or environment variables

## Learned User Preferences

- Communicate in French unless the user writes in another language.
- Prefer applying the recommended direction immediately rather than listing long alternatives.
- Distinctive research-tool UX over generic SaaS or AI-slop aesthetics; often uses the bencium-innovative-ux-designer and emil-design-eng skills. App chrome (sessions, session dashboard, share) should match the landing field kit—kit surfaces, bordered tape lists, mono labels—not shadcn sidebar/breadcrumb or SaaS cards. Votes, sheets, dialogs, share/presentation, and dashboard invitations stay uniform field-kit; keep the wall dock short (icons over text labels; live chip + Workshop), no floating vote overlay over the tray.
- Affinity cluster and vote chrome should match the Skripta mark: no FigJam-like per-type rainbow or orange that fights the logo; packets should not look stacked, and sort-tray slips must not all overlap. Prefer “cluster” (not “frame”) naming.
- Workshop voting is Round → Stick → Flip (fun team sticker round, not FigJam menus): votes are dots; Spent is empty-pocket status only (re-click unsticks); Sit out leaves the local UI with Join to return; Flip reveals for everyone; Round dock handoff shows Stuck / Still (who spent) and who Flipped.
- Personas are Casts: movable wall fiches with avatars (drag like clusters), reached from the affinity wall—not a standalone persona-generator; peek beside the Cast above the dock, spawn beside clusters not on them; dismiss via outside click or re-click; deleting a Cast from the wall must actually remove it (persist, not local-only).
- Transcript interaction is a cassette model: no Pin vs Play mode; click seeks a line only while audio is playing; drag or text selection pins Quote / Pain / Follow-up.
- Pin drag should feel physical (follow the pointer, bounce back, then show Quote / Pain / Follow-up). Avoid unlabeled "Mark" affordances and instructional empty-state copy.
- Affinity/wall work stays on the wall: peek tape or cassette in place instead of navigating away to the transcript; wall comments can sit freestanding (not only on clusters).
- Affinity clusters should feel like a field-kit packet/envelope (liasse)—more fun than FigJam, not by copying FigJam pastels, stickers, or Sparkles/AI-rename chrome.
- Affinity wall undo/redo should be Figma-like (Ctrl+Z / Ctrl+Shift+Z, one gesture = one step, every map action not only cluster moves) and must never restore an empty map; workshop/vote should not disable pan, undo, grouping, or suggestions.
- In-app Signal is for Skripta users/testers (nudge/reminder to leave feedback), distinct from stakeholder Signal on the public Issue page.

## Learned Workspace Facts

- Product is Skripta (skripta.app), a field kit for interview research, positioned as Dovetail-budget for one study (not Maze or research-ops tags/charts).
- Core researcher flow: interview audio → transcript → pins → affinity map → Issue; in-study Find searches pins and sitting text, groups hits by sitting, and peeks the tape in place.
- Pin kinds are Quote, Pain, and Follow-up (shortcuts Q / P / F); the interview transcript is the pin tool.
- Sitting Prep is a cassette tab: light interview guide of 3–8 questions with checkboxes for during/after the sitting.
- After saving a transcription, land on the interview transcript page, not the project dashboard.
- Affinity wall state (clusters, slips, votes, Casts) persists; leaving the wall must not discard the map; Cast delete must remove the Cast from shared state.
- Affinity wall is collaborative; teammates' clusters and the insight tray must stay visible without a page refresh.
- Ungrouped pins live on a wall tray (plateau) and import automatically from project insights; tray import must not duplicate slips already on the board (`insightId`).
- Locked affinity packets remain votable; lock blocks edit, drag, and rename only.
- Issue is the share climax: stakeholder brief ordered Flip → packets → Cast, Print-ready (not a return to PowerPoint/FigJam-style slide decks); Export is `.md`; public Issue offers stakeholder Signal (Clear / Almost / Unclear) to the founder inbox; share must not dump raw first transcript segments under pins; no Cut / Walk / Pull jargon or endless interactive presentation scroll.
