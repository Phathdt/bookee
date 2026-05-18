import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Separator } from './separator';

describe('Separator', () => {
  it('renders with data-slot attribute', () => {
    render(<Separator data-testid="sep" />);
    expect(screen.getByTestId('sep')).toHaveAttribute('data-slot', 'separator');
  });

  it('renders horizontal by default', () => {
    render(<Separator data-testid="sep" />);
    expect(screen.getByTestId('sep')).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('renders vertical when orientation is set', () => {
    render(<Separator orientation="vertical" data-testid="sep" />);
    expect(screen.getByTestId('sep')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('applies additional className', () => {
    render(<Separator className="my-custom" data-testid="sep" />);
    expect(screen.getByTestId('sep')).toHaveClass('my-custom');
  });

  it('is decorative by default (no role attribute)', () => {
    render(<Separator data-testid="sep" />);
    // Radix decorative separators do not have an explicit role="separator"
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('renders as non-decorative separator role when decorative=false', () => {
    render(<Separator decorative={false} data-testid="sep" />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
