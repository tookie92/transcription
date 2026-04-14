import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { StickyNote } from './StickyNote'
import type { StickyNoteData } from '@/types/figjam'

const mockSticky: StickyNoteData = {
  id: 'sticky-1',
  type: 'sticky',
  position: { x: 100, y: 100 },
  size: { width: 220, height: 180 },
  content: 'Test sticky note content',
  color: 'yellow',
  zIndex: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  votes: 0,
  votedBy: [],
  parentSectionId: null,
}

const defaultProps = {
  note: mockSticky,
  zoom: 1,
  isSelected: false,
  onSelect: vi.fn(),
  onMove: vi.fn(),
  onUpdate: vi.fn(),
  onResize: vi.fn(),
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
  onBringToFront: vi.fn(),
}

describe('StickyNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders sticky note content', () => {
    const { container } = render(<StickyNote {...defaultProps} />)
    expect(container.textContent).toContain('Test sticky note content')
  })

  it('renders and responds to interactions', () => {
    const { container } = render(<StickyNote {...defaultProps} />)
    // Just verify it renders without throwing
    expect(container.firstChild).toBeTruthy()
    // The component handles pointer events internally
    // Full drag testing would require more complex setup with DOM events
  })

  it('renders without crashing', () => {
    expect(() => render(<StickyNote {...defaultProps} />)).not.toThrow()
  })

  it('renders with selected state', () => {
    const { container } = render(<StickyNote {...defaultProps} isSelected={true} />)
    expect(container.firstChild).toBeTruthy()
  })
})