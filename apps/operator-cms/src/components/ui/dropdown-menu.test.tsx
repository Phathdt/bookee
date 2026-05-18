import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';

function BasicDropdown({ onItemClick = vi.fn() }: { onItemClick?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onItemClick}>Item one</DropdownMenuItem>
        <DropdownMenuItem>Item two</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('does not show content initially', () => {
    render(<BasicDropdown />);
    expect(screen.queryByText('Item one')).not.toBeInTheDocument();
  });

  it('opens when trigger is clicked', async () => {
    render(<BasicDropdown />);
    await userEvent.click(screen.getByText('Open menu'));
    await waitFor(() => {
      expect(screen.getByText('Item one')).toBeInTheDocument();
      expect(screen.getByText('Item two')).toBeInTheDocument();
    });
  });

  it('calls onClick when menu item is clicked', async () => {
    const onItemClick = vi.fn();
    render(<BasicDropdown onItemClick={onItemClick} />);
    await userEvent.click(screen.getByText('Open menu'));
    await waitFor(() => screen.getByText('Item one'));
    await userEvent.click(screen.getByText('Item one'));
    expect(onItemClick).toHaveBeenCalledOnce();
  });

  it('renders DropdownMenuLabel', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('My Account')).toBeInTheDocument();
    });
  });

  it('renders DropdownMenuSeparator', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item A</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Item B</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(document.querySelector('[data-slot="dropdown-menu-separator"]')).toBeInTheDocument();
    });
  });

  it('renders DropdownMenuGroup', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem>Grouped item</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('Grouped item')).toBeInTheDocument();
    });
  });

  it('renders DropdownMenuShortcut', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Copy
            <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('⌘C')).toBeInTheDocument();
    });
  });

  it('renders DropdownMenuCheckboxItem', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>Show toolbar</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('Show toolbar')).toBeInTheDocument();
    });
  });

  it('renders DropdownMenuRadioGroup with RadioItem', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="top">
            <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('Top')).toBeInTheDocument();
      expect(screen.getByText('Bottom')).toBeInTheDocument();
    });
  });

  it('renders DropdownMenuSub with SubTrigger and SubContent', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('More')).toBeInTheDocument();
    });
  });

  it('renders item with inset prop', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem inset>Inset item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('Inset item')).toBeInTheDocument();
    });
  });

  it('renders item with destructive variant', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      const item = screen.getByText('Delete').closest('[data-slot="dropdown-menu-item"]');
      expect(item).toHaveAttribute('data-variant', 'destructive');
    });
  });

  it('renders items via explicit DropdownMenuPortal', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open portal</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Portal item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByText('Open portal'));
    await waitFor(() => {
      expect(screen.getByText('Portal item')).toBeInTheDocument();
    });
  });
});
