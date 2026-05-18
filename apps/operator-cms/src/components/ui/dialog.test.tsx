import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Button } from './button';

function BasicDialog({ showCloseButton = true }: { showCloseButton?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>Test dialog</DialogTitle>
          <DialogDescription>Dialog description text.</DialogDescription>
        </DialogHeader>
        <p>Dialog body content</p>
        <DialogFooter>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('does not show content initially', () => {
    render(<BasicDialog />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens when trigger is clicked', async () => {
    render(<BasicDialog />);
    await userEvent.click(screen.getByRole('button', { name: /open dialog/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('shows title and description when open', async () => {
    render(<BasicDialog />);
    await userEvent.click(screen.getByRole('button', { name: /open dialog/i }));
    await waitFor(() => {
      expect(screen.getByText('Test dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog description text.')).toBeInTheDocument();
    });
  });

  it('shows close button by default', async () => {
    render(<BasicDialog />);
    await userEvent.click(screen.getByRole('button', { name: /open dialog/i }));
    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  it('hides close button when showCloseButton is false', async () => {
    render(<BasicDialog showCloseButton={false} />);
    await userEvent.click(screen.getByRole('button', { name: /open dialog/i }));
    await waitFor(() => {
      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });
  });

  it('renders DialogFooter with showCloseButton=true', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
          <DialogFooter showCloseButton>
            <Button>Other action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    await waitFor(() => {
      // DialogFooter renders a Close button when showCloseButton=true
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  it('controlled open prop shows dialog', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Controlled</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Controlled')).toBeInTheDocument();
  });

  it('onOpenChange is called when dialog would close', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Managed</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    // Press Escape to trigger close
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('DialogClose button closes the dialog', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>With DialogClose</DialogTitle>
          <DialogClose asChild>
            <Button>Close me</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: /open/i }));
    await waitFor(() => screen.getByText('With DialogClose'));
    await userEvent.click(screen.getByRole('button', { name: /close me/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
