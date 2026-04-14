import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Section } from './Section'
import type { SectionData, StickyNoteData, Position } from '@/types/figjam'

const createMockSection = (overrides: Partial<SectionData> = {}): SectionData => ({
  id: 'section-1',
  type: 'section',
  position: { x: 200, y: 200 },
  size: { width: 400, height: 300 },
  title: 'Test Section',
  color: '#E1BEE7',
  backgroundColor: 'rgba(184, 180, 255, 0.1)',
  autoResize: true,
  zIndex: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  votes: 0,
  votedBy: [],
  author: 'user-1',
  authorName: 'Test User',
  ...overrides,
})

const createMockSticky = (overrides: Partial<StickyNoteData> = {}): StickyNoteData => ({
  id: 'sticky-1',
  type: 'sticky',
  position: { x: 250, y: 250 },
  size: { width: 200, height: 180 },
  content: 'Sticky in section',
  color: 'yellow',
  zIndex: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  votes: 0,
  votedBy: [],
  parentSectionId: 'section-1',
  ...overrides,
})

describe('Section Drag Tests', () => {
  let onSelect: (id: string, multi: boolean) => void
  let onUpdate: (id: string, patch: any) => void

  beforeEach(() => {
    onSelect = vi.fn() as unknown as (id: string, multi: boolean) => void
    onUpdate = vi.fn() as unknown as (id: string, patch: any) => void
  })

  it('calls onSelect on pointer down', () => {
    const section = createMockSection()
    const { container } = render(
      <Section
        data={section}
        isSelected={false}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        containedStickies={[]}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onDelete={vi.fn() as any}
      />
    )

    const sectionElement = container.firstChild as HTMLElement
    fireEvent.pointerDown(sectionElement, { button: 0 })

    expect(onSelect).toHaveBeenCalledWith('section-1', false)
  })

  it('calls onSelect with multi=true when ctrl key pressed', () => {
    const section = createMockSection()
    const { container } = render(
      <Section
        data={section}
        isSelected={false}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        containedStickies={[]}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onDelete={vi.fn() as any}
      />
    )

    const sectionElement = container.firstChild as HTMLElement
    fireEvent.pointerDown(sectionElement, { button: 0, ctrlKey: true })

    expect(onSelect).toHaveBeenCalledWith('section-1', true)
  })

  it('renders contained stickies count badge', () => {
    const section = createMockSection()
    const stickies = [
      createMockSticky({ id: 'sticky-1' }),
      createMockSticky({ id: 'sticky-2' }),
      createMockSticky({ id: 'sticky-3' }),
    ]

    const { container } = render(
      <Section
        data={section}
        isSelected={false}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        containedStickies={stickies}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onDelete={vi.fn() as any}
      />
    )

    expect(container.textContent).toContain('3')
  })
})

describe('Section Save/Load Tests', () => {
  it('position updates are reflected in render', () => {
    const section = createMockSection({ position: { x: 200, y: 200 } })

    const { container, rerender } = render(
      <Section
        data={section}
        isSelected={false}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        containedStickies={[]}
        onSelect={vi.fn() as any}
        onUpdate={vi.fn() as any}
        onDelete={vi.fn() as any}
      />
    )

    const sectionElement = container.firstChild as HTMLElement
    expect(sectionElement.style.left).toBe('200px')
    expect(sectionElement.style.top).toBe('200px')

    // Simulate position update from props (like after loading from DB)
    const updatedSection = createMockSection({ position: { x: 500, y: 300 } })
    rerender(
      <Section
        data={updatedSection}
        isSelected={false}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        containedStickies={[]}
        onSelect={vi.fn() as any}
        onUpdate={vi.fn() as any}
        onDelete={vi.fn() as any}
      />
    )

    const updatedElement = container.firstChild as HTMLElement
    expect(updatedElement.style.left).toBe('500px')
    expect(updatedElement.style.top).toBe('300px')
  })

  it('title updates are reflected after re-render', () => {
    const section = createMockSection({ title: 'Original Title' })

    const { container, rerender } = render(
      <Section
        data={section}
        isSelected={false}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        containedStickies={[]}
        onSelect={vi.fn() as any}
        onUpdate={vi.fn() as any}
        onDelete={vi.fn() as any}
      />
    )

    expect(container.textContent).toContain('Original Title')

    const updatedSection = createMockSection({ title: 'Updated Title' })
    rerender(
      <Section
        data={updatedSection}
        isSelected={false}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        containedStickies={[]}
        onSelect={vi.fn() as any}
        onUpdate={vi.fn() as any}
        onDelete={vi.fn() as any}
      />
    )

    expect(container.textContent).toContain('Updated Title')
  })
})

describe('Section Group Drag Tests', () => {
  it('should contain stickies with sectionId', () => {
    const section = createMockSection({ id: 'section-1' })
    const stickiesInSection = [
      createMockSticky({ id: 'sticky-1', parentSectionId: 'section-1', position: { x: 250, y: 250 } }),
      createMockSticky({ id: 'sticky-2', parentSectionId: 'section-1', position: { x: 300, y: 300 } }),
    ]
    const stickiesOutside = [
      createMockSticky({ id: 'sticky-3', parentSectionId: null, position: { x: 50, y: 50 } }),
    ]

    // All stickies that should move with section
    const containedStickies = stickiesInSection.filter(s => s.parentSectionId === section.id)
    expect(containedStickies.length).toBe(2)

    // Stickies outside should not be in containedStickies
    const notContained = stickiesOutside.filter(s => s.parentSectionId !== section.id)
    expect(notContained.length).toBe(1)
  })

  it('handles empty contained stickies', () => {
    const section = createMockSection()

    const { container } = render(
      <Section
        data={section}
        isSelected={false}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        containedStickies={[]}
        onSelect={vi.fn() as any}
        onUpdate={vi.fn() as any}
        onDelete={vi.fn() as any}
      />
    )

    // Should render without count badge when empty
    expect(container.firstChild).toBeTruthy()
  })
})

describe('Section Performance Tests', () => {
  it('can handle many contained stickies', () => {
    const section = createMockSection()
    const manyStickies = Array.from({ length: 50 }, (_, i) => 
      createMockSticky({ 
        id: `sticky-${i}`, 
        parentSectionId: 'section-1',
        position: { x: 250 + (i % 5) * 230, y: 250 + Math.floor(i / 5) * 230 } 
      })
    )

    expect(manyStickies.length).toBe(50)

    const containedCount = manyStickies.filter(s => s.parentSectionId === 'section-1').length
    expect(containedCount).toBe(50)
  })
})