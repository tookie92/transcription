import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '',
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    const { alt, ...rest } = props
    return <img alt={alt} {...rest} />
  },
}))

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => () => Promise.resolve()),
  useConvex: vi.fn(() => ({})),
}))

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: null, isLoaded: true }),
  useAuth: () => ({ userId: null, isLoaded: true }),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock setPointerCapture and releasePointerCapture for jsdom
if (typeof window !== 'undefined') {
  window.Element.prototype.setPointerCapture = vi.fn()
  window.Element.prototype.releasePointerCapture = vi.fn()
}