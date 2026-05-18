import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';
import { AuthGuard } from './auth-guard';

function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { sub: 1, role: 'admin', operatorId: null },
    setUser: () => {},
    isAdmin: true,
    isOperator: false,
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactNode, auth: AuthContextValue | null, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  it('renders children when user is authenticated', () => {
    renderWithRouter(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
      makeAuth(),
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to /login when user is null', () => {
    renderWithRouter(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
      makeAuth({ user: null }),
    );
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when requireAdmin=true and user is admin', () => {
    renderWithRouter(
      <AuthGuard requireAdmin>
        <div>Admin section</div>
      </AuthGuard>,
      makeAuth({ isAdmin: true }),
    );
    expect(screen.getByText('Admin section')).toBeInTheDocument();
  });

  it('redirects to / when requireAdmin=true but user is not admin', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthContext.Provider
          value={makeAuth({
            user: { sub: 2, role: 'operator', operatorId: 5 },
            isAdmin: false,
            isOperator: true,
          })}
        >
          <Routes>
            <Route
              path="/admin"
              element={
                <AuthGuard requireAdmin>
                  <div>Admin only</div>
                </AuthGuard>
              }
            />
            <Route path="/" element={<div>Home page</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByText('Home page')).toBeInTheDocument();
    expect(screen.queryByText('Admin only')).not.toBeInTheDocument();
  });

  it('passes through multiple children', () => {
    renderWithRouter(
      <AuthGuard>
        <div>Child one</div>
        <div>Child two</div>
      </AuthGuard>,
      makeAuth(),
    );
    expect(screen.getByText('Child one')).toBeInTheDocument();
    expect(screen.getByText('Child two')).toBeInTheDocument();
  });
});
