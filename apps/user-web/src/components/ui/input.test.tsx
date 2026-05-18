import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './input';

describe('Input', () => {
  it('renders with given type and forwards props', () => {
    render(<Input type="email" placeholder="email" />);
    const el = screen.getByPlaceholderText('email');
    expect(el).toHaveAttribute('type', 'email');
    expect(el).toHaveAttribute('data-slot', 'input');
  });

  it('merges className', () => {
    render(<Input className="custom-class" data-testid="i" />);
    expect(screen.getByTestId('i').className).toContain('custom-class');
  });
});
