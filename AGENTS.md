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
