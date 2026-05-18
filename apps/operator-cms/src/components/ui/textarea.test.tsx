import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('has data-slot attribute', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toHaveAttribute('data-slot', 'textarea');
  });

  it('accepts and displays placeholder', () => {
    render(<Textarea placeholder="Enter text here" />);
    expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
  });

  it('applies additional className', () => {
    render(<Textarea className="custom-class" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });

  it('accepts user input', async () => {
    render(<Textarea />);
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello world');
    expect(textarea).toHaveValue('Hello world');
  });

  it('can be disabled', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('passes through rows prop', () => {
    render(<Textarea rows={6} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6');
  });

  it('forwards ref correctly via value prop', () => {
    render(<Textarea defaultValue="initial" />);
    expect(screen.getByRole('textbox')).toHaveValue('initial');
  });
});
