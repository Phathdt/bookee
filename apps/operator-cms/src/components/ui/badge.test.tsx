import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Admin</Badge>);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveAttribute('data-variant', 'default');
  });

  it('renders with secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const badge = screen.getByText('Secondary');
    expect(badge).toHaveAttribute('data-variant', 'secondary');
  });

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge).toHaveAttribute('data-variant', 'destructive');
  });

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText('Outline');
    expect(badge).toHaveAttribute('data-variant', 'outline');
  });

  it('renders with ghost variant', () => {
    render(<Badge variant="ghost">Ghost</Badge>);
    const badge = screen.getByText('Ghost');
    expect(badge).toHaveAttribute('data-variant', 'ghost');
  });

  it('renders with link variant', () => {
    render(<Badge variant="link">Link</Badge>);
    const badge = screen.getByText('Link');
    expect(badge).toHaveAttribute('data-variant', 'link');
  });

  it('renders as span by default', () => {
    render(<Badge>Span Badge</Badge>);
    const badge = screen.getByText('Span Badge');
    expect(badge.tagName).toBe('SPAN');
  });

  it('renders as child element when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/test">Link Badge</a>
      </Badge>,
    );
    const badge = screen.getByRole('link', { name: 'Link Badge' });
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe('A');
  });

  it('applies additional className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge).toHaveClass('custom-class');
  });

  it('passes through data-slot attribute', () => {
    render(<Badge>Slot Test</Badge>);
    const badge = screen.getByText('Slot Test');
    expect(badge).toHaveAttribute('data-slot', 'badge');
  });
});
