import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { Input } from './input';
import { Button } from './button';

const schema = z.object({
  username: z.string().min(3, 'Must be at least 3 characters'),
  bio: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function StaticForm() {
  const form = useForm({ defaultValues: { x: 'valid' } });
  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="x"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage>Static hint</FormMessage>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function EmptyMsgForm() {
  const form = useForm({ defaultValues: { x: 'valid' } });
  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="x"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function TestForm({ onSubmit = () => {} }: { onSubmit?: (v: FormValues) => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', bio: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

describe('Form components', () => {
  it('renders label and input', () => {
    render(<TestForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  it('renders form description', () => {
    render(<TestForm />);
    expect(screen.getByText('Your public display name.')).toBeInTheDocument();
  });

  it('shows validation error on invalid submit', async () => {
    render(<TestForm />);
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByText('Must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('does not show error message when field is valid', async () => {
    render(<TestForm onSubmit={() => {}} />);
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.queryByText('Must be at least 3 characters')).not.toBeInTheDocument();
    });
  });

  it('label is linked to input via htmlFor', () => {
    render(<TestForm />);
    const input = screen.getByLabelText(/username/i);
    expect(input).toBeInTheDocument();
  });

  it('label has data-error when field is invalid', async () => {
    render(<TestForm />);
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      const label = screen.getByText('Username');
      expect(label).toHaveAttribute('data-error', 'true');
    });
  });

  it('FormMessage renders children when no error', () => {
    render(<StaticForm />);
    expect(screen.getByText('Static hint')).toBeInTheDocument();
  });

  it('FormMessage renders nothing when no error and no children', () => {
    render(<EmptyMsgForm />);
    expect(document.querySelector('[data-slot="form-message"]')).toBeNull();
  });
});
