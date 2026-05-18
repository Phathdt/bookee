import { zodResolver } from '@hookform/resolvers/zod';
import { useLoginUser } from '@bookee/api-client';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { AuthUser } from '@/features/auth/auth-context';
import { useAuthContext } from '@/features/auth/auth-context';
import { saveToken } from '@/lib/auth-store';
import { decodeJwtPayload } from '@/lib/jwt';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Phone or email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthContext();
  const loginMutation = useLoginUser();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const res = await loginMutation.mutateAsync({ data: values });
      saveToken(res.tokens.accessToken);

      const payload = decodeJwtPayload(res.tokens.accessToken);
      if (payload) {
        setUser(payload as AuthUser);
      }

      toast.success('Signed in successfully');

      const role = res.user.role;
      /* v8 ignore next 5 -- defensive else; all known roles navigate to '/' */
      if (role === 'admin' || role === 'operator' || role === 'driver') {
        void navigate('/');
      } else {
        void navigate('/');
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Login failed. Check your credentials.';
      toast.error(String(message));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Bookee CMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your operator account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone or Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+84901234567 or admin@example.com"
                      data-testid="login-identifier-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      data-testid="login-password-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="login-submit"
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
