import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

describe('Table', () => {
  it('renders a table element', () => {
    render(<Table />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('has data-slot on the table element', () => {
    render(<Table />);
    expect(screen.getByRole('table')).toHaveAttribute('data-slot', 'table');
  });

  it('renders TableHeader with thead', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('renders TableBody with tbody content', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell content</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('Cell content')).toBeInTheDocument();
  });

  it('renders TableFooter', () => {
    render(
      <Table>
        <TableFooter>
          <TableRow>
            <TableCell>Footer total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(screen.getByText('Footer total')).toBeInTheDocument();
  });

  it('renders TableCaption', () => {
    render(
      <Table>
        <TableCaption>A list of items</TableCaption>
      </Table>,
    );
    expect(screen.getByText('A list of items')).toBeInTheDocument();
  });

  it('applies custom className to Table', () => {
    render(<Table className="custom-table" />);
    expect(screen.getByRole('table')).toHaveClass('custom-table');
  });

  it('renders full table structure with all slots', () => {
    render(
      <Table>
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Col A</TableHead>
            <TableHead>Col B</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>A1</TableCell>
            <TableCell>B1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>A2</TableCell>
            <TableCell>B2</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total: 2 rows</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(screen.getByText('Caption')).toBeInTheDocument();
    expect(screen.getByText('Col A')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('Total: 2 rows')).toBeInTheDocument();
  });

  it('TableHead has correct data-slot', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    const th = screen.getByRole('columnheader', { name: 'Name' });
    expect(th).toHaveAttribute('data-slot', 'table-head');
  });

  it('TableCell has correct data-slot', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const td = screen.getByRole('cell', { name: 'Data' });
    expect(td).toHaveAttribute('data-slot', 'table-cell');
  });
});
