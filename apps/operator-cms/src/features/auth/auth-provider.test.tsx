import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthContext } from './auth-context';
import { AuthProvider } from './auth-provider';

// Must be before imports of the module under test
vi.mock('@/lib/jwt', () => ({
  decodeJwtPayload: vi.fn(),
}));

vi.mock('@/lib/auth-store', () => ({
  getStoredToken: vi.fn(),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  hydrateAuth: vi.fn(),
  setAuthToken: vi.fn(),
}));

import { decodeJwtPayload } from '@/lib/jwt';
import { getStoredToken } from '@/lib/auth-store';

const mockDecodeJwtPayload = vi.mocked(decodeJwtPayload);
const mockGetStoredToken = vi.mocked(getStoredToken);

function SetUserComponent() {
  const { user, setUser } = useAuthContext();
  return (
    <div>
      <div data-testid="user">{user ? user.role : 'none'}</div>
      <button onClick={() => setUser({ sub: 99, role: 'admin', operatorId: null })}>
        Set admin
      </button>
    </div>
  );
}

function ConsumerComponent() {
  const { user, isAdmin, isOperator } = useAuthContext();
  if (!user) return <div>No user</div>;
  return (
    <div>
      <div data-testid="role">{user.role}</div>
      <div data-testid="is-admin">{String(isAdmin)}</div>
      <div data-testid="is-operator">{String(isOperator)}</div>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides null user when no token in storage', () => {
    mockGetStoredToken.mockReturnValue(null);
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>,
    );
    expect(screen.getByText('No user')).toBeInTheDocument();
  });

  it('provides null user when token exists but cannot be decoded', () => {
    mockGetStoredToken.mockReturnValue('bad.token.here');
    mockDecodeJwtPayload.mockReturnValue(null);
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>,
    );
    expect(screen.getByText('No user')).toBeInTheDocument();
  });

  it('hydrates user from stored token when valid', () => {
    mockGetStoredToken.mockReturnValue('valid.token.here');
    mockDecodeJwtPayload.mockReturnValue({
      sub: 1,
      role: 'admin',
      operatorId: null,
    });
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>,
    );
    expect(screen.getByTestId('role')).toHaveTextContent('admin');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('is-operator')).toHaveTextContent('false');
  });

  it('sets isOperator=true for operator role', () => {
    mockGetStoredToken.mockReturnValue('valid.token.here');
    mockDecodeJwtPayload.mockReturnValue({
      sub: 2,
      role: 'operator',
      operatorId: 7,
    });
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>,
    );
    expect(screen.getByTestId('is-operator')).toHaveTextContent('true');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });

  it('sets isOperator=true for driver role', () => {
    mockGetStoredToken.mockReturnValue('valid.token.here');
    mockDecodeJwtPayload.mockReturnValue({
      sub: 3,
      role: 'driver',
      operatorId: 5,
    });
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>,
    );
    expect(screen.getByTestId('is-operator')).toHaveTextContent('true');
  });

  it('exposes setUser to update the user', async () => {
    mockGetStoredToken.mockReturnValue(null);

    const { getByRole, getByTestId } = render(
      <AuthProvider>
        <SetUserComponent />
      </AuthProvider>,
    );

    expect(getByTestId('user')).toHaveTextContent('none');
    await userEvent.click(getByRole('button', { name: /set admin/i }));
    expect(getByTestId('user')).toHaveTextContent('admin');
  });
});
