import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';

function BasicAlertDialog({
  onAction = vi.fn(),
  onCancel = vi.fn(),
}: {
  onAction?: () => void;
  onCancel?: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Open</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onAction}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe('AlertDialog', () => {
  it('does not show dialog content initially', () => {
    render(<BasicAlertDialog />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('opens when trigger is clicked', async () => {
    render(<BasicAlertDialog />);
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  it('shows title and description when open', async () => {
    render(<BasicAlertDialog />);
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    });
  });

  it('calls onAction when confirm is clicked', async () => {
    const onAction = vi.fn();
    render(<BasicAlertDialog onAction={onAction} />);
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => screen.getByText('Confirm'));
    await userEvent.click(screen.getByText('Confirm'));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<BasicAlertDialog onCancel={onCancel} />);
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => screen.getByText('Cancel'));
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders with size=sm via data-size attribute', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent size="sm">
          <AlertDialogTitle>Small dialog</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await waitFor(() => {
      const content = document.querySelector('[data-slot="alert-dialog-content"]');
      expect(content).toHaveAttribute('data-size', 'sm');
    });
  });

  it('renders AlertDialogMedia slot', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <span>icon</span>
            </AlertDialogMedia>
            <AlertDialogTitle>With media</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await waitFor(() => {
      expect(screen.getByText('icon')).toBeInTheDocument();
    });
  });

  it('renders action button as disabled when prop is set', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Title</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogAction disabled>Disabled Action</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await waitFor(() => {
      expect(screen.getByText('Disabled Action').closest('button')).toBeDisabled();
    });
  });

  it('controlled open prop shows dialog when true', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Controlled open</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText('Controlled open')).toBeInTheDocument();
  });
});
