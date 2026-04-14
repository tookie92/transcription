# 🎨 FigJamBoard Refactor Plan

**Date:** 2026-04-14
**Objectif:** Refonte complète du système FigJamBoard pour une architecture simplifiée, robuste et proche de FigJam

---

## 🎯 Objectifs

1. ✅ Simplifier l'architecture (éliminer les DOM refs et la complexité actuelle)
2. ✅ S'inspirer de FigJam réel pour l'UX (sticky notes, sections)
3. ✅ Corriger définitivement les problèmes de drag
4. ✅ Utiliser shadcn/ui pour les composants
5. ✅ Maintenir la compatibilité avec Convex et la collaboration

---

## 📋 Analyse des problèmes actuels

### Problèmes identifiés:

1. **DOM Refs causent des race conditions**
   - `domPositionRef` utilisé pour le drag
   - Conflit entre position DOM et state React
   - Retard et glitch après plusieurs drags

2. **Architecture trop complexe**
   - Hook `useFigJamBoard` avec reducer complexe
   - Multiples refs (`draggingClusterRef`, `draggingClusterStartPosRef`, `domPositionRef`, etc.)
   - Gestion manuelle du drag et des collisions

3. **Double source de vérité**
   - `clusters` (ancien système Convex)
   - `canvasClusters` (nouveau système FigJamBoard)

4. **Performance**
   - Callbacks recréés inutilement
   - Trop de re-renders inutiles

---

## 🏗️ Nouvelle Architecture Proposée

### Principes:

1. **State React au lieu de DOM manipulation**
   - Utiliser `useState` et `useReducer` pour tout
   - Ne jamais manipuler le DOM directement
   - React re-render toujours, mais optimisé

2. **Positionnement absolu simple**
   - Chaque élément a `x, y` dans le state
   - Pas de calcul complexe de positions relatives
   - Drag = mise à jour de `x, y`

3. **Composants simples et isolés**
   - `StickyNote` - gère son propre drag
   - `Section` (remplace ClusterLabel) - gère son propre drag
   - `Canvas` - gère zoom/pan et les outils

4. **Utiliser shadcn/ui**
   - Dialog pour les menus contextuels
   - Popover pour les menus
   - Button pour les actions
   - Input pour l'édition

5. **Synchronisation temps réel hybride**
   - Pendant le drag : utilise Convex `presence` (pas d'écriture DB)
   - Après le drag : sauvegarde finale en base de données
   - C'est comme FigJam/Figma : feedback visuel instantané, sauvegarde stable

---

## ⚡ Synchronisation Temps Réel (Approche Hybride)

### Problème des approches classiques

**Approche 1 : Sauvegarde instantanée (Trop de writes)**
```typescript
// Pendant le drag - update DB à chaque frame
const handleMove = (x, y) => {
  saveElements({ mapId, elements: { ...current, position: { x, y } } }); // ❌ Trop de writes
};
```
- ❌ Trop d'écritures en base pendant le drag
- ❌ Peut causer des race conditions
- ❌ Coûteux en performance

**Approche 2 : Debounced (Lag)**
```typescript
// Sauvegarde avec 500ms de délai
const saveElementsDebounced = useDebounce(saveElements, 500);
```
- ❌ Les autres utilisateurs voient un lag
- ❌ Pas fluide pour la collaboration
- ❌ Mauvaise UX

### Solution : Approche Hybride (Recommandée ✅)

**Comment ça marche :**

1. **Pendant le drag** - Utiliser Convex `presence` :
   ```typescript
   // Drag start
   updatePresence({
     dragging: {
       elementId: sticky.id,
       x: currentX,
       y: currentY,
       author: user.id,
       authorName: user.name
     }
   });

   // Pendant le drag (update presence)
   const handleMove = (x, y) => {
     updatePresence({
       dragging: {
         elementId: sticky.id,
         x,
         y,
         author: user.id,
         authorName: user.name
       }
     });
     // Update local state pour l'utilisateur qui drag
     onUpdate(sticky.id, { position: { x, y } });
   };
   ```

2. **Après le drag** - Sauvegarder en base une seule fois :
   ```typescript
   // Drag end
   const handleDragEnd = () => {
     // Sauvegarder position finale en DB
     saveElements({ mapId, elements: updatedElements });

     // Nettoyer presence
     updatePresence({ dragging: null });
   };
   ```

3. **Les autres utilisateurs** - Écouter le presence :
   ```typescript
   const others = useOthers();
   const draggingElements = others
     .filter(other => other.presence?.dragging)
     .map(other => ({
       ...other.presence.dragging,
       author: other.info.name,
       isGhost: true // Élément fantôme pour montrer le drag en cours
     }));

   // Rendu avec ghost elements
   return (
     <div>
       {stickies.map(sticky => (
         <StickyNote key={sticky.id} data={sticky} />
       ))}
       {draggingElements.map(ghost => (
         <GhostElement key={ghost.elementId} data={ghost} />
       ))}
     </div>
   );
   ```

### Avantages de l'approche hybride

✅ **Fluide** - Tous les utilisateurs voient le mouvement en temps réel
✅ **Économique** - Pas d'écritures DB pendant le drag
✅ **Simple** - Convex presence est built-in, 2 lignes de code
✅ **Robuste** - Une seule sauvegarde stable après le drag
✅ **Authentique** - C'est exactement comme FigJam/Figma

### Pourquoi Convex Presence ?

- **Built-in** : Pas besoin de WebSocket custom
- **Automatique** : Gère les déconnexions et timeouts
- **Type-safe** : Types TypeScript pour le presence
- **Synchronisé** : Tous les utilisateurs reçoivent les mises à jour instantanément

### Exemple d'implémentation complète

```typescript
// useCollaboration.ts
export function useCollaboration(mapId: string) {
  const updateMyPresence = useMyPresence();

  const startDrag = useCallback((elementId: string, position: Position) => {
    updateMyPresence({
      dragging: {
        elementId,
        ...position,
        timestamp: Date.now()
      }
    });
  }, [updateMyPresence]);

  const updateDrag = useCallback((elementId: string, position: Position) => {
    updateMyPresence({
      dragging: {
        elementId,
        ...position,
        timestamp: Date.now()
      }
    });
  }, [updateMyPresence]);

  const endDrag = useCallback(() => {
    updateMyPresence({ dragging: null });
  }, [updateMyPresence]);

  const others = useOthers();
  const draggingElements = others
    .filter(other => other.presence?.dragging)
    .map(other => ({
      ...other.presence.dragging,
      authorName: other.info.name,
      author: other.info.userId,
      isGhost: true
    }));

  return { startDrag, updateDrag, endDrag, draggingElements };
}
```

---

## 📁 Structure des Fichiers

```
components/myComponents/figjam/
├── FigJamBoard.tsx              # Canvas principal (refactor)
├── StickyNote.tsx               # Sticky note (nouveau design)
├── Section.tsx                  # Section/remplace ClusterLabel (nouveau)
├── Toolbar.tsx                  # Toolbar avec outils
├── Minimap.tsx                  # Minimap (gardé)
├── ContextMenu.tsx              # Menu contextuel (shadcn Dialog)
└── types.ts                     # Types TypeScript

hooks/
├── useFigJamBoard.ts           # Refactor - logique simplifiée
├── useCanvas.ts                 # Zoom/pan logique
└── useCollaboration.ts          # Cursor, presence, locks

types/
└── figjam.ts                    # Types communs
```

---

## 🎨 Design Inspiré de FigJam

### Sticky Notes:

**Tailles (FigJam standard):**
- Small: 180px × 180px (carré)
- Large: 240px × 180px (rectangulaire, type "index card")

**Couleurs (FigJam palette):**
```typescript
const STICKY_COLORS = {
  yellow: { bg: '#FFF9C4', text: '#5D4037' },
  blue: { bg: '#BBDEFB', text: '#0D47A1' },
  green: { bg: '#C8E6C9', text: '#1B5E20' },
  pink: { bg: '#F8BBD9', text: '#880E4F' },
  orange: { bg: '#FFE0B2', text: '#E65100' },
  purple: { bg: '#E1BEE7', text: '#4A148C' },
  gray: { bg: '#F5F5F5', text: '#424242' },
} as const;
```

**Caractéristiques:**
- Auto-resize vertical avec le contenu
- Nom de l'auteur en bas
- Coin de resize horizontal (droite)
- Double-click pour éditer
- Drag via bord ou via handle

### Sections (Clusters):

**Caractéristiques:**
- Background semi-transparent (ex: rgba(184, 180, 255, 0.1))
- Border dashed (selection) ou solid
- Titre éditable en haut
- Stickies sont "contenus" visuellement mais pas logiquement
- Auto-resize quand des éléments sont ajoutés/supprimés
- Drag via bord ou via handle

---

## 🔧 Types TypeScript

```typescript
// types/figjam.ts
export type StickyColor = keyof typeof STICKY_COLORS;

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface StickyNoteData {
  id: string;
  type: 'sticky';
  position: Position;
  size: Size;
  content: string;
  color: StickyColor;
  sectionId?: string; // ✅ ID de la section qui contient ce sticky (optionnel)
  author: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  zIndex: number;
}

export interface SectionData {
  id: string;
  type: 'section';
  position: Position;
  size: Size;
  title: string;
  backgroundColor?: string;
  borderColor?: string;
  author: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  zIndex: number;
}

export type CanvasElement = StickyNoteData | SectionData;

export interface CanvasState {
  elements: Record<string, CanvasElement>;
  selectedIds: string[];
  zoom: number;
  pan: Position;
  activeTool: ToolType;
}

export type ToolType = 'select' | 'sticky' | 'section' | 'hand';
```

---

## 🧩 Nouveaux Composants

### ⚠️ Corrections apportées au plan initial

Après revue, 3 bugs ont été identifiés et corrigés dans ce plan :

**Bug #1 : Double application du zoom**
- ❌ Avant : Canvas parent ET StickyNote/Section appliquaient `scale(${zoom})`
- ✅ Corrigé : Seul le canvas parent applique le zoom
- Impact : Évite que les éléments soient zoomés 2x

**Bug #2 : Drag offset sans le pan**
- ❌ Avant : `const x = (e.clientX - canvas.left - dragOffset.x) / zoom`
- ✅ Corrigé : `const x = (e.clientX - canvas.left - pan.x - dragOffset.x) / zoom`
- Impact : Le drag fonctionne correctement même quand le canvas est panné

**Bug #3 : Stickies comme enfants DOM de Section**
- ❌ Avant : Les stickies étaient rendus à l'intérieur du DOM de la Section
- ✅ Corrigé : Tous les éléments sont au même niveau DOM
- Impact : Évite les problèmes de transform hérité, drag plus simple

### 🎯 Approche Figma/Affinity Diagram pour les Sections

Dans Figma, les frames/sections fonctionnent comme ceci :

1. **Conteneur avec drag en groupe** :
   - Background semi-transparent
   - Border (dashed par défaut, solid quand sélectionné)
   - Titre éditable au-dessus
   - ✅ Quand on drage une section, tous les stickies à l'intérieur bougent avec elle

2. **Positionnement relatif** :
   - Les stickies ont leur propre position absolue (x, y)
   - Mais leur position est relative à la section pour le drag en groupe
   - Quand la section bouge, on applique le même delta à tous ses stickies

3. **Regroupement logique** :
   - Les sections contiennent logiquement des éléments
   - Les éléments sont "assignés" à une section (optionnel)
   - Drag en groupe automatique quand on drage la section

4. **Z-order** :
   - Sections : z-index bas (rendues en premier)
   - Stickies : z-index plus élevé (rendues au-dessus)

**C'est ce comportement que nous allons implémenter pour les affinity diagrams.**

---

### 1. StickyNote.tsx

```typescript
interface StickyNoteProps {
  data: StickyNoteData;
  isSelected: boolean;
  zoom: number;
  pan: Position; // ✅ Ajouté pour le calcul du drag
  sections: SectionData[]; // ✅ Sections disponibles pour l'assignation
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, patch: Partial<StickyNoteData>) => void;
  onDelete: (id: string) => void;
  isLocked?: boolean;
  lockedBy?: string;
}

export function StickyNote({ data, isSelected, zoom, pan, onSelect, onUpdate, onDelete }: StickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);

  // Handle drag - simple state updates
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);

    if (onSelect) {
      onSelect(data.id, e.shiftKey || e.ctrlKey);
    }
  };

  // Pointer move on window (document)
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const canvas = document.querySelector('.figjam-canvas')?.getBoundingClientRect();
      if (!canvas) return;

      // ✅ CORRECTION : Convert to canvas coordinates avec le pan
      const x = (e.clientX - canvas.left - pan.x - dragOffset.x) / zoom;
      const y = (e.clientY - canvas.top - pan.y - dragOffset.y) / zoom;

      onUpdate(data.id, { position: { x, y } });
    };

    const handlePointerUp = () => {
      // ✅ Assigner à une section si on est dans une section à la fin du drag
      const newSection = sections.find(section =>
        isInsideSection({ ...data, position: data.position }, section)
      );

      const newSectionId = newSection?.id;

      // Mettre à jour sectionId seulement s'il a changé
      if (newSectionId !== data.sectionId) {
        onUpdate(data.id, { sectionId: newSectionId });
      }

      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragOffset, zoom, pan, data, sections, onUpdate]);

  const stickyColor = STICKY_COLORS[data.color];

  return (
    <div
      className={cn(
        "absolute group cursor-pointer transition-shadow hover:shadow-lg",
        isSelected && "ring-2 ring-blue-500"
      )}
      style={{
        left: data.position.x,
        top: data.position.y,
        width: data.size.width,
        height: data.size.height,
        backgroundColor: stickyColor.bg,
        color: stickyColor.text,
        zIndex: data.zIndex,
        // ✅ CORRECTION : PAS de zoom ici (déjà appliqué par le canvas parent)
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => setIsEditing(true)}
    >
      {/* Content */}
      {isEditing ? (
        <textarea
          autoFocus
          defaultValue={data.content}
          onBlur={(e) => {
            onUpdate(data.id, { content: e.target.value });
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditing(false);
            } else if (e.key === 'Enter' && !e.shiftKey) {
              e.currentTarget.blur();
            }
          }}
          className="w-full h-full p-4 bg-transparent resize-none outline-none"
          style={{ color: stickyColor.text }}
        />
      ) : (
        <div className="p-4 whitespace-pre-wrap" style={{ color: stickyColor.text }}>
          {data.content || <span className="opacity-50">Double-click to edit</span>}
        </div>
      )}

      {/* Author name */}
      <div className="absolute bottom-2 left-4 text-xs opacity-50" style={{ color: stickyColor.text }}>
        {data.authorName}
      </div>

      {/* Resize handle */}
      <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10" />

      {/* Delete button on hover */}
      <button
        className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/10"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(data.id);
        }}
      >
        <X className="w-3 h-3" style={{ color: stickyColor.text }} />
      </button>
    </div>
  );
}
```

### 2. Section.tsx

**⚠️ IMPORTANT : Les sections fonctionnent comme les frames de Figma**
- Quand on drage une section, tous les stickies à l'intérieur se déplacent avec elle
- Les stickies sont identifiés par leur champ `sectionId`
- Les stickies sont rendus au même niveau DOM pour éviter les problèmes de transform

```typescript
interface SectionProps {
  data: SectionData;
  isSelected: boolean;
  zoom: number;
  pan: Position;
  containedStickies: StickyNoteData[]; // ✅ Stickies qui ont sectionId = data.id
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, patch: Partial<SectionData | StickyNoteData>) => void;
  onDelete: (id: string) => void;
}

export function Section({
  data,
  isSelected,
  zoom,
  pan,
  containedStickies,
  onSelect,
  onUpdate,
  onDelete
}: SectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null); // ✅ Position de départ pour calculer le delta
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.button !== 0) return;

    setDragStartPos({ x: data.position.x, y: data.position.y }); // ✅ Sauvegarder position de départ
    setIsDragging(true);
    onSelect(data.id, e.shiftKey || e.ctrlKey);
  };

  // ✅ Drag avec déplacement des stickies contenus
  useEffect(() => {
    if (!isDragging || !dragStartPos) return;

    const handlePointerMove = (e: PointerEvent) => {
      const canvas = document.querySelector('.figjam-canvas')?.getBoundingClientRect();
      if (!canvas) return;

      // Calculer la nouvelle position de la section
      const x = (e.clientX - canvas.left - pan.x) / zoom;
      const y = (e.clientY - canvas.top - pan.y) / zoom;

      // Calculer le delta depuis le début du drag
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;

      // Mettre à jour la position de la section
      onUpdate(data.id, { position: { x, y } });

      // ✅ Mettre à jour tous les stickies contenus avec le même delta
      containedStickies.forEach(sticky => {
        const newX = sticky.position.x + deltaX;
        const newY = sticky.position.y + deltaY;
        onUpdate(sticky.id, { position: { x: newX, y: newY } });
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setDragStartPos(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragStartPos, zoom, pan, data, containedStickies, onUpdate]);

  return (
    <div
      className={cn(
        "absolute group border-2 rounded-xl",
        isSelected ? "border-blue-500" : "border-dashed border-purple-300"
      )}
      style={{
        left: data.position.x,
        top: data.position.y,
        width: data.size.width,
        height: data.size.height,
        backgroundColor: data.backgroundColor || 'rgba(184, 180, 255, 0.1)',
        borderColor: data.borderColor || undefined,
        zIndex: data.zIndex,
        // ✅ PAS de zoom ici (déjà appliqué par le canvas parent)
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Title */}
      <div className="absolute -top-7 left-0">
        {isEditingTitle ? (
          <input
            autoFocus
            defaultValue={data.title}
            onBlur={(e) => {
              onUpdate(data.id, { title: e.target.value });
              setIsEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.currentTarget.blur();
              }
            }}
            className="px-2 py-1 text-sm font-medium bg-white/90 backdrop-blur rounded border border-purple-300 outline-none"
          />
        ) : (
          <span
            className="px-2 py-1 text-sm font-medium bg-white/90 backdrop-blur rounded border border-purple-300"
            onDoubleClick={() => setIsEditingTitle(true)}
          >
            {data.title || 'Untitled Section'}
          </span>
        )}
      </div>

      {/* Resize handles */}
      <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-purple-300/30" />
      <div className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-purple-300/30" />
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-purple-300/30" />
    </div>
  );
}
```

**Note :** Les stickies sont rendus séparément dans FigJamBoard au même niveau DOM. La section les drage en appliquant le même delta à tous les stickies qui ont `sectionId` correspondant.

### 3. FigJamBoard.tsx (Refactor)

```typescript
interface FigJamBoardProps {
  mapId?: string;
  projectId?: string;
  projectName?: string;
  onBack?: () => void;
  // ... other props
}

export function FigJamBoard({ mapId, projectId, projectName, onBack }: FigJamBoardProps) {
  // Simple state management
  const [elements, setElements] = useState<Record<string, CanvasElement>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [isDragging, setIsDragging] = useState(false);

  // Load from Convex
  const savedElements = useQuery(
    mapId ? api.affinityMaps.getFigJamElements : "skip",
    mapId ? { mapId } : {}
  );

  const saveElements = useMutation(api.affinityMaps.saveFigJamElements);

  // Load elements from Convex
  useEffect(() => {
    if (savedElements && Object.keys(savedElements).length > 0) {
      setElements(savedElements);
    }
  }, [savedElements]);

  // Save to Convex (debounced)
  const saveElementsDebounced = useDebounce((newElements: Record<string, CanvasElement>) => {
    if (mapId) {
      saveElements({ mapId, elements: newElements });
    }
  }, 500);

  // Save whenever elements change
  useEffect(() => {
    saveElementsDebounced(elements);
  }, [elements, mapId, saveElements, saveElementsDebounced]);

  // Tool actions
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = e.currentTarget as HTMLElement;
    const canvasRect = canvas.getBoundingClientRect();

    if (activeTool === 'sticky') {
      const pos = screenToCanvas(e.clientX, e.clientY, canvasRect, pan, zoom);
      const newSticky: StickyNoteData = {
        id: `sticky-${Date.now()}`,
        type: 'sticky',
        position: pos,
        size: { width: 180, height: 180 },
        content: '',
        color: 'yellow',
        author: 'user-id',
        authorName: 'You',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        zIndex: Math.max(...Object.values(elements).map(e => e.zIndex), 0) + 1,
      };
      setElements(prev => ({ ...prev, [newSticky.id]: newSticky }));
      setActiveTool('select');
    } else if (activeTool === 'section') {
      const pos = screenToCanvas(e.clientX, e.clientY, canvasRect, pan, zoom);
      const newSection: SectionData = {
        id: `section-${Date.now()}`,
        type: 'section',
        position: pos,
        size: { width: 400, height: 300 },
        title: 'New Section',
        backgroundColor: 'rgba(184, 180, 255, 0.1)',
        author: 'user-id',
        authorName: 'You',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        zIndex: 0,
      };
      setElements(prev => ({ ...prev, [newSection.id]: newSection }));
      setActiveTool('select');
    } else {
      setSelectedIds([]);
    }
  }, [activeTool, elements, pan, zoom]);

  // Render
  const stickies = Object.values(elements).filter(e => e.type === 'sticky') as StickyNoteData[];
  const sections = Object.values(elements).filter(e => e.type === 'section') as SectionData[];

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      {/* Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onBack={onBack}
        projectName={projectName}
      />

      {/* Canvas */}
      <div
        className="figjam-canvas absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        onClick={handleCanvasClick}
      >
        {/* ✅ CORRECTION : Rendre tous les éléments au même niveau DOM */}
        {/* Sections (bottom layer) */}
        {sections.map((section) => {
          // ✅ Trouver tous les stickies qui appartiennent à cette section
          const containedStickies = stickies.filter(sticky => sticky.sectionId === section.id);

          return (
            <Section
              key={section.id}
              data={section}
              isSelected={selectedIds.includes(section.id)}
              zoom={zoom}
              pan={pan}
              containedStickies={containedStickies}
              onSelect={(id, multi) => setSelectedIds(prev => {
                if (multi) {
                  return prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
                }
                return [id];
              })}
              onUpdate={(id, patch) => setElements(prev => ({
                ...prev,
                [id]: { ...prev[id], ...patch, updatedAt: Date.now() } as CanvasElement,
              }))}
              onDelete={(id) => setElements(prev => {
                const newElements = { ...prev };
                delete newElements[id];
                return newElements;
              })}
            />
          );
        })}

        {/* Stickies (top layer) - tous au même niveau DOM */}
        {stickies.map((sticky) => (
          <StickyNote
            key={sticky.id}
            data={sticky}
            isSelected={selectedIds.includes(sticky.id)}
            zoom={zoom}
            pan={pan}
            sections={sections} // ✅ Passer les sections pour l'assignation
            onSelect={(id, multi) => setSelectedIds(prev => {
              if (multi) {
                return prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
              }
              return [id];
            })}
            onUpdate={(id, patch) => setElements(prev => ({
              ...prev,
              [id]: { ...prev[id], ...patch, updatedAt: Date.now() } as CanvasElement,
            }))}
            onDelete={(id) => setElements(prev => {
              const newElements = { ...prev };
              delete newElements[id];
              return newElements;
            })}
          />
        ))}
      </div>

      {/* Minimap */}
      <Minimap
        sections={sections}
        stickies={stickies}
        zoom={zoom}
        pan={pan}
      />
    </div>
  );
}

// ✅ Helper function pour regroupement visuel
// Utilisé pour :
// - Auto-assignation d'un sticky à une section quand on le dépose dans une section
// - Trouver les stickies contenus dans une section pour le drag en groupe
function isInsideSection(sticky: StickyNoteData, section: SectionData): boolean {
  return (
    sticky.position.x >= section.position.x &&
    sticky.position.y >= section.position.y &&
    sticky.position.x + sticky.size.width <= section.position.x + section.size.width &&
    sticky.position.y + sticky.size.height <= section.position.y + section.size.height
  );
}

// ✅ NOTE : Les sections fonctionnent comme les frames de Figma
// - Les stickies ont leur propre position absolue indépendante
// - Une section est un rectangle semi-transparent avec un titre
// - Quand on drage une section, tous les stickies avec `sectionId` correspondant se déplacent avec elle
// - Quand on drage un sticky, il s'assigne automatiquement à la section qui le contient (via sectionId)
// - C'est le design des affinity diagrams : sections = regroupement thématique avec drag en groupe

// ✅ Helper function pour convertir les coordonnées écran → canvas
function screenToCanvas(clientX: number, clientY: number, canvasRect: DOMRect, pan: Position, zoom: number): Position {
  return {
    x: (clientX - canvasRect.left - pan.x) / zoom,
    y: (clientY - canvasRect.top - pan.y) / zoom,
  };
}
```

---

## 🔄 Transition Plan

### Phase 1: Créer les nouveaux composants (Nouveau code)

1. ✅ Créer `types/figjam.ts` avec les nouveaux types
2. ✅ Créer `StickyNote.tsx` (nouveau design FigJam)
3. ✅ Créer `Section.tsx` (remplace ClusterLabel)
4. ✅ Créer nouveau `FigJamBoard.tsx` (architecture simplifiée)

### Phase 2: Migrer la logique existante

1. ✅ Migrer la sauvegarde/chargement Convex
2. ✅ Migrer la collaboration (cursors, locks)
3. ✅ Migrer le voting
4. ✅ Migrer les autres features (comments, etc.)

### Phase 3: Nettoyer et supprimer l'ancien code

1. ✅ Supprimer `useFigJamBoard.ts` (old)
2. ✅ Supprimer `ClusterLabel.tsx`
3. ✅ Supprimer `useDraggable.ts`
4. ✅ Supprimer `useContainment.ts`
5. ✅ Nettoyer autres fichiers inutiles

### Phase 4: Tests et validation

1. ✅ Tester toutes les features de drag
2. ✅ Tester la collaboration
3. ✅ Tester le voting
4. ✅ Performance tests

---

## 📝 À propos de AffinityMapWorkspace.tsx

### Est-ce nécessaire? **OUI, mais simplifié**

**Rôle actuel:**
- Wrapper autour de FigJamBoard
- Gère les side panels
- Gère la logique de données (clusters, insights, handlers)

**Nouveau rôle proposé:**
```typescript
// AffinityMapWorkspace.tsx (simplifié)
export function AffinityMapWorkspace({ projectId }: AffinityMapWorkspaceProps) {
  const router = useRouter();
  const { userId } = useAuth();

  // Load project and affinity map
  const project = useQuery(api.projects.getById, { projectId });
  const affinityMap = useQuery(
    api.affinityMaps.getByProject,
    { projectId }
  );

  // Just a wrapper - all logic moves to FigJamBoard
  if (!project || !affinityMap) {
    return <LoadingView />;
  }

  return (
    <div className="h-full relative">
      {/* Header */}
      <AffinityMapHeader project={project} onBack={() => router.push(`/project/${projectId}`)} />

      {/* FigJamBoard - handles everything */}
      <FigJamBoard
        mapId={affinityMap._id}
        projectId={projectId}
        projectName={project.name}
        onBack={() => router.push(`/project/${projectId}`)}
      />

      {/* Side Panels - kept as overlay */}
      <CanvasSidePanels
        mapId={affinityMap._id}
        projectId={projectId}
        projectName={project.name}
        onOpenPanel={(panel) => setActivePanel(panel)}
      />
    </div>
  );
}
```

---

## 🎨 Composants shadcn/ui à utiliser

1. **Dialog** - Pour les menus contextuels
2. **Popover** - Pour les menus tooltips
3. **Button** - Pour toutes les actions
4. **Input** - Pour l'édition
5. **Textarea** - Pour le contenu des stickies
6. **Separator** - Pour les diviseurs
7. **DropdownMenu** - Pour les menus déroulants
8. **Tooltip** - Pour les tooltips
9. **Avatar** - Pour les avatars utilisateur
10. **Badge** - Pour les notifications

---

## 🚀 Avantages de cette approche

1. **Simplicité** - Plus de refs, plus de manipulation DOM
2. **Robustesse** - React gère tout le state
3. **Maintenabilité** - Code plus simple à comprendre
4. **Performance** - Moins de re-renders inutiles
5. **UX FigJam** - Design authentique FigJam

---

## 📦 Checklist d'implémentation

### Phase 1 : Nouveaux composants
- [ ] Créer `types/figjam.ts` avec types TypeScript
- [ ] Créer `StickyNote.tsx` avec design FigJam
- [ ] Créer `Section.tsx` pour remplacer ClusterLabel
- [ ] Créer nouveau `FigJamBoard.tsx` simplifié
- [ ] Créer `useCollaboration.ts` avec présence pour drag temps réel

### Phase 2 : Intégration
- [ ] Migrer la sauvegarde/chargement Convex
- [ ] Implémenter la synchronisation hybride (presence + DB)
- [ ] Migrer les cursurs collaboratifs
- [ ] Migrer les locks d'édition
- [ ] Migrer le voting
- [ ] Créer nouveau `Toolbar.tsx`
- [ ] Adapter `Minimap.tsx`

### Phase 3 : Nettoyage
- [ ] Simplifier `AffinityMapWorkspace.tsx` comme wrapper
- [ ] Supprimer l'ancien `useFigJamBoard.ts`
- [ ] Supprimer `ClusterLabel.tsx`
- [ ] Supprimer `useDraggable.ts`
- [ ] Supprimer `useContainment.ts`
- [ ] Nettoyer autres fichiers inutiles

### Phase 4 : Tests
- [ ] Tester tous les drags (sticky, section, multi)
- [ ] Tester le drag temps réel avec plusieurs utilisateurs
- [ ] Tester la sauvegarde/chargement
- [ ] Tester la collaboration (cursors, presence, locks)
- [ ] Tester le voting
- [ ] Performance tests avec 100+ éléments

---

**Note:** Ce plan peut être ajusté pendant l'implémentation. L'objectif est de simplifier autant que possible l'architecture tout en gardant toutes les fonctionnalités.
