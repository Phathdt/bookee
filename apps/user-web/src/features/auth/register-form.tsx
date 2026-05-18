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

import { type RegisterFormValues, registerSchema } from './auth-schemas';
import { useRegisterMutation } from './hooks/use-auth-flow';

interface RegisterFormProps {
  onSuccess: (accessToken: string) => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const mutation = useRegisterMutation();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', email: '', password: '' },
  });

  async function onSubmit(values: RegisterFormValues) {
    const res = await mutation.mutateAsync({ data: values });
    onSuccess(res.tokens.accessToken);
  }

  const error = mutation.error as { message?: string } | null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Họ và tên</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  data-testid="register-name-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Số điện thoại</FormLabel>
              <FormControl>
                <Input
                  placeholder="0901234567"
                  autoComplete="tel"
                  data-testid="register-phone-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  data-testid="register-email-input"
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
                  placeholder="≥ 8 ký tự"
                  autoComplete="new-password"
                  data-testid="register-password-input"
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
          data-testid="register-submit"
        >
          {mutation.isPending ? 'Đang xử lý…' : 'Tạo tài khoản'}
        </Button>
      </form>
    </Form>
  );
}
