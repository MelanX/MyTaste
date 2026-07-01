import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorSection from '../components/ErrorSection';

describe('ErrorSection', () => {
  it('renders nothing when there is no title and no details', () => {
    const { container } = render(<ErrorSection title={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title as an alert', () => {
    render(<ErrorSection title="Fehler beim Speichern" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Fehler beim Speichern');
  });

  it('renders a list item per detail', () => {
    render(<ErrorSection title="Import fehlgeschlagen" details={['Zeile 1', 'Zeile 2']} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Zeile 1');
    expect(items[1]).toHaveTextContent('Zeile 2');
  });

  it('does not render a list when there are no details', () => {
    render(<ErrorSection title="Nur Titel" />);
    expect(screen.queryByRole('list')).toBeNull();
  });
});
