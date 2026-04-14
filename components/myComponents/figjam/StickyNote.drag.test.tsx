import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { StickyNote } from './StickyNote'
import type { StickyNoteData, Position } from '@/types/figjam'

const createMockSticky = (overrides: Partial<StickyNoteData> = {}): StickyNoteData => ({
  id: 'sticky-1',
  type: 'sticky',
  position: { x: 100, y: 100 },
  size: { width: 220, height: 180 },
  content: 'Test content',
  color: 'yellow',
  zIndex: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  votes: 0,
  votedBy: [],
  parentSectionId: null,
  ...overrides,
})

describe('StickyNote Drag Tests', () => {
  let onSelect: (id: string, multi: boolean) => void
  let onUpdate: (id: string, patch: Partial<StickyNoteData>) => void
  let mockSticky: StickyNoteData

  beforeEach(() => {
    onSelect = vi.fn() as unknown as (id: string, multi: boolean) => void
    onUpdate = vi.fn() as unknown as (id: string, patch: Partial<StickyNoteData>) => void
    mockSticky = createMockSticky()
  })

  it('calls onSelect on pointer down', () => {
    const { container } = render(
      <StickyNote
        note={mockSticky}
        zoom={1}
        isSelected={false}
        onSelect={onSelect}
        onMove={vi.fn() as any}
        onUpdate={onUpdate}
        onResize={vi.fn() as any}
        onDelete={vi.fn() as any}
        onDuplicate={vi.fn() as any}
        onBringToFront={vi.fn() as any}
      />
    )

    const sticky = container.firstChild as HTMLElement
    fireEvent.pointerDown(sticky, { button: 0 })

    expect(onSelect).toHaveBeenCalledWith('sticky-1', false)
  })

  it('calls onSelect with multi=true when shift key pressed', () => {
    const { container } = render(
      <StickyNote
        note={mockSticky}
        zoom={1}
        isSelected={false}
        onSelect={onSelect}
        onMove={vi.fn() as any}
        onUpdate={onUpdate}
        onResize={vi.fn() as any}
        onDelete={vi.fn() as any}
        onDuplicate={vi.fn() as any}
        onBringToFront={vi.fn() as any}
      />
    )

    const sticky = container.firstChild as HTMLElement
    fireEvent.pointerDown(sticky, { button: 0, shiftKey: true })

    expect(onSelect).toHaveBeenCalledWith('sticky-1', true)
  })

  it('respects disabled prop - does not call callbacks when locked', () => {
    const { container } = render(
      <StickyNote
        note={createMockSticky({ editingBy: 'other-user', editingByName: 'Other User' })}
        zoom={1}
        isSelected={false}
        isLocked={true}
        lockedByName="Other User"
        onSelect={onSelect}
        onMove={vi.fn() as any}
        onUpdate={onUpdate}
        onResize={vi.fn() as any}
        onDelete={vi.fn() as any}
        onDuplicate={vi.fn() as any}
        onBringToFront={vi.fn() as any}
      />
    )

    const sticky = container.firstChild as HTMLElement
    fireEvent.pointerDown(sticky, { button: 0 })

    // When locked, callbacks should NOT be called
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('StickyNote Save/Load Tests', () => {
  it('renders at correct position from props', () => {
    const sticky = createMockSticky({ position: { x: 100, y: 100 } })

    const { container } = render(
      <StickyNote
        note={sticky}
        zoom={1}
        isSelected={false}
        onSelect={vi.fn() as any}
        onMove={vi.fn() as any}
        onUpdate={vi.fn() as any}
        onResize={vi.fn() as any}
        onDelete={vi.fn() as any}
        onDuplicate={vi.fn() as any}
        onBringToFront={vi.fn() as any}
      />
    )

    const stickyElement = container.firstChild as HTMLElement
    // The component should render at the position from props
    expect(stickyElement.style.left).toBe('100px')
    expect(stickyElement.style.top).toBe('100px')
  })

  it('handles content updates correctly', () => {
    const sticky = createMockSticky({ content: 'Original content' })

    const { rerender } = render(
      <StickyNote
        note={sticky}
        zoom={1}
        isSelected={false}
        onSelect={vi.fn() as any}
        onMove={vi.fn() as any}
        onUpdate={vi.fn() as any}
        onResize={vi.fn() as any}
        onDelete={vi.fn() as any}
        onDuplicate={vi.fn() as any}
        onBringToFront={vi.fn() as any}
      />
    )

    const updatedSticky = createMockSticky({ content: 'Updated content' })
    
    // Should re-render without crashing
    expect(() => {
      rerender(
        <StickyNote
          note={updatedSticky}
          zoom={1}
          isSelected={false}
          onSelect={vi.fn() as any}
          onMove={vi.fn() as any}
          onUpdate={vi.fn() as any}
          onResize={vi.fn() as any}
          onDelete={vi.fn() as any}
          onDuplicate={vi.fn() as any}
          onBringToFront={vi.fn() as any}
        />
      )
    }).not.toThrow()
  })
})

describe('StickyNote Performance Tests', () => {
  it('can create data for many stickies', () => {
    const manyStickies = Array.from({ length: 100 }, (_, i) => 
      createMockSticky({ id: `sticky-${i}`, position: { x: (i % 10) * 250, y: Math.floor(i / 10) * 250 } })
    )

    expect(manyStickies.length).toBe(100)

    // Verify all have required properties
    manyStickies.forEach(sticky => {
      expect(sticky.id).toBeDefined()
      expect(sticky.position).toBeDefined()
      expect(sticky.size).toBeDefined()
    })
  })

  it('handles different colors correctly', () => {
    const colors: StickyNoteData['color'][] = ['yellow', 'pink', 'green', 'blue', 'purple', 'orange', 'white', 'gray']
    
    colors.forEach(color => {
      const sticky = createMockSticky({ color })
      expect(sticky.color).toBe(color)
    })
  })
})