import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { makeAuthValue, makeOperatorAuth, renderWithProviders } from '@/test/test-utils';
import { ProtectedLayout } from './protected-layout';

describe('ProtectedLayout', () => {
  it('renders sidebar, topbar and outlet when authenticated', () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<div>Page content</div>} />
        </Route>
      </Routes>,
      { auth: makeAuthValue() },
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
    // Topbar renders "Operator CMS"
    expect(screen.getByText('Operator CMS')).toBeInTheDocument();
    // Sidebar renders brand name
    expect(screen.getAllByText('Bookee CMS').length).toBeGreaterThan(0);
  });

  it('redirects to /login when user is null', () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<div>Protected page</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>,
      { auth: makeAuthValue({ user: null }) },
    );
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected page')).not.toBeInTheDocument();
  });

  it('redirects to / when requireAdmin=true and user is not admin', () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedLayout requireAdmin />}>
          <Route path="/" element={<div>Admin page</div>} />
        </Route>
      </Routes>,
      { auth: makeOperatorAuth(5) },
    );
    // Non-admin gets redirected away from admin-required layout
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument();
  });

  it('allows admin through requireAdmin guard', () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedLayout requireAdmin />}>
          <Route path="/" element={<div>Admin only content</div>} />
        </Route>
      </Routes>,
      { auth: makeAuthValue() },
    );
    expect(screen.getByText('Admin only content')).toBeInTheDocument();
  });
});
