import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { LanguageProvider } from '../data/LanguageContext';

// Mock App dependencies
vi.mock('../firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn((cb) => {
      cb(null);
      return vi.fn();
    }),
  },
  db: {},
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb(null);
    return vi.fn();
  }),
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(),
  where: vi.fn(),
  handleFirestoreError: vi.fn(),
  OperationType: {
    GET: 'get',
    LIST: 'list',
    CREATE: 'create',
    WRITE: 'write',
  },
  getDoc: vi.fn(),
}));

describe('App', () => {
  it('should render the login screen when not authenticated', () => {
    render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );
    
    // Check if the login screen is rendered
    // Since we mocked auth to return null, it should show Login component
    // We can check for some text that is in the Login component
    expect(screen.getByText(/Tanakh365/i)).toBeDefined();
  });
});
