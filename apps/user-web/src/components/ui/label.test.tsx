import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Label } from './label';

describe('Label', () => {
  it('renders children with data-slot=label', () => {
    render(<Label>Email</Label>);
    const el = screen.getByText('Email');
    expect(el).toHaveAttribute('data-slot', 'label');
  });

  it('merges custom className', () => {
    render(<Label className="extra">x</Label>);
    expect(screen.getByText('x').className).toContain('extra');
  });
});
