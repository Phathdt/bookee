import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeAuthValue, makeOperatorAuth, renderWithProviders } from '@/test/test-utils';
import { SidebarNav } from './sidebar-nav';

describe('SidebarNav', () => {
  it('renders brand name', () => {
    renderWithProviders(<SidebarNav />, { auth: makeAuthValue() });
    expect(screen.getByText('Bookee CMS')).toBeInTheDocument();
  });

  it('renders all nav items for admin', () => {
    renderWithProviders(<SidebarNav />, { auth: makeAuthValue() });
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /stations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /routes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /seat layouts/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /trips/i })).toBeInTheDocument();
  });

  it('hides adminOnly items for operator user', () => {
    renderWithProviders(<SidebarNav />, { auth: makeOperatorAuth(7) });
    expect(screen.queryByRole('link', { name: /stations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /seat layouts/i })).not.toBeInTheDocument();
  });

  it('shows non-admin items for operator user', () => {
    renderWithProviders(<SidebarNav />, { auth: makeOperatorAuth(7) });
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /routes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /trips/i })).toBeInTheDocument();
  });

  it('nav links point to correct paths', () => {
    renderWithProviders(<SidebarNav />, { auth: makeAuthValue() });
    expect(screen.getByRole('link', { name: /stations/i })).toHaveAttribute('href', '/stations');
    expect(screen.getByRole('link', { name: /routes/i })).toHaveAttribute('href', '/routes');
    expect(screen.getByRole('link', { name: /vehicles/i })).toHaveAttribute('href', '/vehicles');
    expect(screen.getByRole('link', { name: /trips/i })).toHaveAttribute('href', '/trips');
  });

  it('dashboard link points to /', () => {
    renderWithProviders(<SidebarNav />, { auth: makeAuthValue() });
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/');
  });
});
