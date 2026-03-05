import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/App';

// Mock de localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock de fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
);

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the main title', () => {
    render(<App />);
    const titleElement = screen.getByText(/MUNDO DONGHUA/i);
    expect(titleElement).toBeDefined();
  });

  it('shows loading state for series initially', () => {
    render(<App />);
    // Buscamos el texto que sale cuando no hay series cargadas aún
    const loadingText = screen.getByText(/Cargando.../i);
    expect(loadingText).toBeDefined();
  });
});
