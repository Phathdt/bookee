import {
  useGetMe,
  useLoginUser,
  useRegisterUser,
  useUpdateMe,
  type PublicUserDto,
} from '@bookee/api-client';
import { LogOut, User } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { clearToken, getStoredToken, saveToken } from '@/lib/auth-store';

type Mode = 'login' | 'register';

interface FormState {
  name: string;
  phone: string;
  email: string;
  password: string;
}

/**
 * Minimal end-to-end auth flow demo:
 *   1. Register OR login → store JWT in localStorage
 *   2. useGetMe shows the protected profile
 *   3. useUpdateMe lets user rename
 *   4. Logout clears token
 */
export function AuthDemo() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const isAuthed = token !== null;

  if (!isAuthed) {
    return (
      <AuthForms
        onSuccess={(t) => {
          saveToken(t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <ProfilePanel
      onLogout={() => {
        clearToken();
        setToken(null);
      }}
    />
  );
}

function AuthForms({ onSuccess }: { onSuccess: (accessToken: string) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    password: '',
  });

  const register = useRegisterUser();
  const login = useLoginUser();

  const busy = register.isPending || login.isPending;
  const error = (register.error ?? login.error) as { message?: string } | null;

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (mode === 'register') {
      const res = await register.mutateAsync({ data: form });
      onSuccess(res.tokens.accessToken);
    } else {
      const res = await login.mutateAsync({
        data: { identifier: form.email || form.phone, password: form.password },
      });
      onSuccess(res.tokens.accessToken);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={mode === 'login' ? 'font-semibold underline' : 'text-muted-foreground'}
        >
          Sign in
        </button>
        <span className="text-muted-foreground">/</span>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={mode === 'register' ? 'font-semibold underline' : 'text-muted-foreground'}
        >
          Register
        </button>
      </div>

      {mode === 'register' && (
        <>
          <input
            placeholder="Họ và tên"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Số điện thoại"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          />
        </>
      )}

      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="w-full rounded border px-3 py-2 text-sm"
        required={mode === 'register'}
      />
      <input
        type="password"
        placeholder="Password (≥ 8 ký tự)"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="w-full rounded border px-3 py-2 text-sm"
        required
        minLength={8}
      />

      {error?.message && <p className="text-sm text-destructive">{String(error.message)}</p>}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Đang xử lý…' : mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}
      </Button>
    </form>
  );
}

function ProfilePanel({ onLogout }: { onLogout: () => void }) {
  const { data, isLoading, error, refetch } = useGetMe<PublicUserDto>();
  const update = useUpdateMe();
  const [newName, setNewName] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <User className="size-4" />
        Authenticated profile
      </div>

      {isLoading && <p className="text-sm">Loading…</p>}
      {error != null && (
        <p className="text-sm text-destructive">
          {(error as { message?: string }).message ?? 'Failed to load profile'}
        </p>
      )}
      {data && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">ID</dt>
          <dd>{data.id}</dd>
          <dt className="text-muted-foreground">Name</dt>
          <dd>{data.name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{data.email}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{data.phone}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd>{data.role}</dd>
        </dl>
      )}

      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          await update.mutateAsync({ data: { name: newName.trim() } });
          setNewName('');
          await refetch();
        }}
      >
        <input
          placeholder="New display name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded border px-3 py-1.5 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={update.isPending}>
          Rename
        </Button>
      </form>

      <Button size="sm" variant="ghost" onClick={onLogout}>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
