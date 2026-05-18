import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { useAuthFlow } from './hooks/use-auth-flow';
import { LoginForm } from './login-form';
import { ProfilePanel } from './profile-panel';
import { RegisterForm } from './register-form';

type Mode = 'login' | 'register';

/**
 * End-to-end auth demo:
 *   1. Register OR login → store JWT in localStorage
 *   2. useGetMe shows the protected profile
 *   3. useUpdateMe lets user rename
 *   4. Logout clears token
 */
export function AuthDemo() {
  const { isAuthed, signIn, signOut } = useAuthFlow();
  const [mode, setMode] = useState<Mode>('login');

  if (isAuthed) {
    return <ProfilePanel onLogout={signOut} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm">
        <Button
          type="button"
          variant="link"
          onClick={() => setMode('login')}
          className={mode === 'login' ? 'font-semibold underline' : 'text-muted-foreground'}
          data-testid="auth-demo-mode-login"
        >
          Sign in
        </Button>
        <span className="text-muted-foreground self-center">/</span>
        <Button
          type="button"
          variant="link"
          onClick={() => setMode('register')}
          className={mode === 'register' ? 'font-semibold underline' : 'text-muted-foreground'}
          data-testid="auth-demo-mode-register"
        >
          Register
        </Button>
      </div>

      {mode === 'login' ? <LoginForm onSuccess={signIn} /> : <RegisterForm onSuccess={signIn} />}
    </div>
  );
}
