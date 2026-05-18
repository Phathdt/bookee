import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeAuthValue, makeOperatorAuth, renderWithProviders } from '@/test/test-utils';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  it('renders Dashboard heading', () => {
    renderWithProviders(<DashboardPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('renders welcome back text', () => {
    renderWithProviders(<DashboardPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('renders admin role badge', () => {
    renderWithProviders(<DashboardPage />, { auth: makeAuthValue() });
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders operator role badge for operator user', () => {
    renderWithProviders(<DashboardPage />, { auth: makeOperatorAuth(7) });
    expect(screen.getByText('Operator')).toBeInTheDocument();
  });

  it('shows operator ID for operator user', () => {
    renderWithProviders(<DashboardPage />, { auth: makeOperatorAuth(7) });
    expect(screen.getByText(/Operator #7/)).toBeInTheDocument();
  });

  it('does not show operator ID for admin user', () => {
    renderWithProviders(<DashboardPage />, { auth: makeAuthValue() });
    expect(screen.queryByText(/Operator #/)).not.toBeInTheDocument();
  });

  it('shows all module cards including admin-only for admin', () => {
    renderWithProviders(<DashboardPage />, { auth: makeAuthValue() });
    expect(screen.getByText('Stations')).toBeInTheDocument();
    expect(screen.getByText('Routes')).toBeInTheDocument();
    expect(screen.getByText('Seat Layouts')).toBeInTheDocument();
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
    expect(screen.getByText('Trips')).toBeInTheDocument();
  });

  it('hides admin-only cards for operator user', () => {
    renderWithProviders(<DashboardPage />, { auth: makeOperatorAuth(3) });
    expect(screen.queryByText('Stations')).not.toBeInTheDocument();
    expect(screen.queryByText('Seat Layouts')).not.toBeInTheDocument();
  });

  it('shows non-admin cards for operator user', () => {
    renderWithProviders(<DashboardPage />, { auth: makeOperatorAuth(3) });
    expect(screen.getByText('Routes')).toBeInTheDocument();
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
    expect(screen.getByText('Trips')).toBeInTheDocument();
  });

  it('module cards link to correct paths', () => {
    renderWithProviders(<DashboardPage />, { auth: makeAuthValue() });
    // Use getAllByRole since card text may match multiple accessible names; check href on first match
    const stationLinks = screen.getAllByRole('link', { name: /stations/i });
    expect(stationLinks[0]).toHaveAttribute('href', '/stations');
    const routeLinks = screen.getAllByRole('link', { name: /routes/i });
    expect(routeLinks[0]).toHaveAttribute('href', '/routes');
    const vehicleLinks = screen.getAllByRole('link', { name: /vehicles/i });
    expect(vehicleLinks[0]).toHaveAttribute('href', '/vehicles');
    const tripLinks = screen.getAllByRole('link', { name: /trips/i });
    expect(tripLinks[0]).toHaveAttribute('href', '/trips');
  });

  it('renders without user (null user)', () => {
    renderWithProviders(<DashboardPage />, { auth: makeAuthValue({ user: null }) });
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});
