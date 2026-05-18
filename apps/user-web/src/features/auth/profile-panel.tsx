import { zodResolver } from '@hookform/resolvers/zod';
import { type PublicUserDto, useGetMe, useUpdateMe } from '@bookee/api-client';
import { LogOut, User } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { type RenameFormValues, renameSchema } from './auth-schemas';

interface ProfilePanelProps {
  onLogout: () => void;
}

export function ProfilePanel({ onLogout }: ProfilePanelProps) {
  const { data, isLoading, error, refetch } = useGetMe<PublicUserDto>();
  const update = useUpdateMe();
  const form = useForm<RenameFormValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: { name: '' },
  });

  async function onSubmit(values: RenameFormValues) {
    await update.mutateAsync({ data: { name: values.name } });
    form.reset({ name: '' });
    await refetch();
  }

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

      <Form {...form}>
        <form className="flex gap-2" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    placeholder="Tên hiển thị mới"
                    aria-label="New display name"
                    data-testid="profile-rename-input"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={update.isPending}
            data-testid="profile-rename-submit"
          >
            Rename
          </Button>
        </form>
      </Form>

      <Button size="sm" variant="ghost" onClick={onLogout} data-testid="profile-signout">
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
