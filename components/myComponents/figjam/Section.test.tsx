import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Section } from './Section'
import type { SectionData, StickyNoteData } from '@/types/figjam'

const mockSection: SectionData = {
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
}

const defaultProps = {
  data: mockSection,
  isSelected: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  containedStickies: [] as StickyNoteData[],
  onSelect: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
}

describe('Section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders section title', () => {
    const { container } = render(<Section {...defaultProps} />)
    expect(container.textContent).toContain('Test Section')
  })

  it('renders without crashing', () => {
    expect(() => render(<Section {...defaultProps} />)).not.toThrow()
  })

  it('renders with selected state', () => {
    const { container } = render(<Section {...defaultProps} isSelected={true} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders contained stickies count', () => {
    const { container } = render(<Section {...defaultProps} containedStickies={[
      { id: 'sticky-1', type: 'sticky', position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, content: '', color: 'yellow', zIndex: 1, createdAt: 0, updatedAt: 0, votes: 0, votedBy: [], parentSectionId: null },
      { id: 'sticky-2', type: 'sticky', position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, content: '', color: 'blue', zIndex: 1, createdAt: 0, updatedAt: 0, votes: 0, votedBy: [], parentSectionId: null },
    ]} />)
    expect(container.textContent).toContain('2')
  })
})