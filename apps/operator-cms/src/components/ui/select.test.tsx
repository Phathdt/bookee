import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

function BasicSelect({
  onValueChange = vi.fn(),
  value,
  disabled,
}: {
  onValueChange?: (v: string) => void;
  value?: string;
  disabled?: boolean;
}) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger disabled={disabled}>
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe('Select', () => {
  it('renders trigger with placeholder', () => {
    render(<BasicSelect />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('shows selected value when value is set', () => {
    render(<BasicSelect value="apple" />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('opens dropdown when trigger is clicked', async () => {
    render(<BasicSelect />);
    await userEvent.click(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });
  });

  it('calls onValueChange when an item is selected', async () => {
    const onValueChange = vi.fn();
    render(<BasicSelect onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await waitFor(() => screen.getByText('Banana'));
    await userEvent.click(screen.getByText('Banana'));
    expect(onValueChange).toHaveBeenCalledWith('banana');
  });

  it('renders disabled trigger', () => {
    render(<BasicSelect disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('has data-slot on trigger', () => {
    render(<BasicSelect />);
    expect(screen.getByRole('combobox')).toHaveAttribute('data-slot', 'select-trigger');
  });

  it('renders SelectGroup and SelectLabel', async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByText('Fruits')).toBeInTheDocument();
    });
  });

  it('renders SelectSeparator', async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
          <SelectSeparator />
          <SelectItem value="b">B</SelectItem>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(document.querySelector('[data-slot="select-separator"]')).toBeInTheDocument();
    });
  });

  it('renders trigger with sm size', () => {
    render(
      <Select>
        <SelectTrigger size="sm">
          <SelectValue placeholder="Small" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="x">X</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('data-size', 'sm');
  });

  it('renders SelectContent with position=popper', async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Popper" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="p1">Popper Item</SelectItem>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Popper Item' })).toBeInTheDocument();
    });
  });
});
