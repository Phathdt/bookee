import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

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

import { type LoginFormValues, loginSchema } from './auth-schemas';
import { useLoginMutation } from './hooks/use-auth-flow';

interface LoginFormProps {
  onSuccess: (accessToken: string) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const mutation = useLoginMutation();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    const res = await mutation.mutateAsync({ data: values });
    onSuccess(res.tokens.accessToken);
  }

  const error = mutation.error as { message?: string } | null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email hoặc số điện thoại</FormLabel>
              <FormControl>
                <Input
                  placeholder="you@example.com"
                  autoComplete="username"
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
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  data-testid="login-password-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error?.message && <p className="text-sm text-destructive">{String(error.message)}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isPending}
          data-testid="login-submit"
        >
          {mutation.isPending ? 'Đang xử lý…' : 'Đăng nhập'}
        </Button>
      </form>
    </Form>
  );
}
