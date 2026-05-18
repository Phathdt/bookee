import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-store', () => ({
  clearToken: vi.fn(),
  getStoredToken: vi.fn(() => null),
  saveToken: vi.fn(),
  hydrateAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { clearToken } from '@/lib/auth-store';
import { renderWithProviders, makeAuthValue, makeOperatorAuth } from '@/test/test-utils';
import { Topbar } from './topbar';

const mockClearToken = vi.mocked(clearToken);

describe('Topbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Operator CMS label', () => {
    renderWithProviders(<Topbar />, { auth: makeAuthValue() });
    expect(screen.getByText('Operator CMS')).toBeInTheDocument();
  });

  it('renders user ID when user is present', () => {
    renderWithProviders(<Topbar />, { auth: makeAuthValue() });
    expect(screen.getByText(/ID 1/)).toBeInTheDocument();
  });

  it('renders Account when user is null', () => {
    renderWithProviders(<Topbar />, { auth: makeAuthValue({ user: null }) });
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('renders role badge for admin', () => {
    renderWithProviders(<Topbar />, { auth: makeAuthValue() });
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders role badge for operator', () => {
    renderWithProviders(<Topbar />, { auth: makeOperatorAuth(5) });
    expect(screen.getByText('Operator')).toBeInTheDocument();
  });

  it('opens dropdown menu when trigger is clicked', async () => {
    renderWithProviders(<Topbar />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByText(/ID 1/));
    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });

  it('shows role and operator info in dropdown when open', async () => {
    renderWithProviders(<Topbar />, {
      auth: makeOperatorAuth(7),
    });
    await userEvent.click(screen.getByText(/ID 2/));
    await waitFor(() => {
      expect(screen.getByText(/Operator #7/)).toBeInTheDocument();
    });
  });

  it('shows role without operator ID when operatorId is null', async () => {
    renderWithProviders(<Topbar />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByText(/ID 1/));
    await waitFor(() => {
      expect(screen.getByText(/Role: Admin/)).toBeInTheDocument();
      expect(screen.queryByText(/Operator #/)).not.toBeInTheDocument();
    });
  });

  it('calls clearToken and navigate on sign out', async () => {
    const setUser = vi.fn();
    renderWithProviders(<Topbar />, { auth: makeAuthValue({ setUser }) });
    await userEvent.click(screen.getByText(/ID 1/));
    await waitFor(() => screen.getByText('Sign out'));
    await userEvent.click(screen.getByText('Sign out'));
    expect(mockClearToken).toHaveBeenCalledOnce();
    expect(setUser).toHaveBeenCalledWith(null);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
