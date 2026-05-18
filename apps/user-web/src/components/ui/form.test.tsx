import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

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

function Harness() {
  const form = useForm({ defaultValues: { email: '' } });
  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Your account email</FormDescription>
              <FormMessage>Custom static message</FormMessage>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function EmptyMessageHarness() {
  const form = useForm({ defaultValues: { email: '' } });
  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="email"
          render={() => (
            <FormItem>
              <FormMessage data-testid="empty-message" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

describe('Form primitives', () => {
  it('renders label, control, description, and message', () => {
    render(<Harness />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Your account email')).toBeInTheDocument();
    expect(screen.getByText('Custom static message')).toBeInTheDocument();
  });

  it('renders nothing when FormMessage has no error and no children', () => {
    render(<EmptyMessageHarness />);
    expect(screen.queryByTestId('empty-message')).not.toBeInTheDocument();
  });
});
