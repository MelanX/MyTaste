import React from 'react';
import { render, screen } from '@testing-library/react';
import BringButton from '../components/BringButton';

let mockApiUrl = 'https://api.example';
vi.mock('../config', () => ({ getConfig: () => ({ API_URL: mockApiUrl }) }));
beforeEach(() => {
  mockApiUrl = 'https://api.example';
});

/** Extracts and decodes the `url` query param from a Bring deeplink. */
const bringUrlParam = (href: string): string => {
  const q = href.split('?')[1] ?? '';
  return new URLSearchParams(q).get('url') ?? '';
};
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe('BringButton', () => {
  it('renders nothing when given neither recipeId nor ids', () => {
    const { container } = render(<BringButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when ids is an empty array', () => {
    const { container } = render(<BringButton ids={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the default label and Bring logo for a single recipe', () => {
    render(<BringButton recipeId="r1" />);
    expect(screen.getByText('Zur Einkaufsliste')).toBeInTheDocument();
    expect(screen.getByAltText('Bring Logo')).toBeInTheDocument();
  });

  it('builds a deeplink containing the single-recipe data url', () => {
    render(<BringButton recipeId="r1" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('getbring.com');
    expect(link.getAttribute('href')).toContain(encodeURIComponent('https://api.example/api/bring-recipe/r1'));
  });

  it('builds a bulk deeplink for ids', () => {
    render(<BringButton ids={['a', 'b']} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain(encodeURIComponent('https://api.example/api/bring-bulk?ids=a,b'));
  });

  it('renders a custom label', () => {
    render(<BringButton recipeId="r1" label="Custom!" />);
    expect(screen.getByText('Custom!')).toBeInTheDocument();
  });

  // Regression: on the same-origin (mono-docker) deployment API_URL is empty. The
  // deeplink is fetched by Bring's servers, so its `url` param MUST be absolute —
  // a host-less "/api/..." path is unreachable and silently breaks the import.
  describe('with empty API_URL (same-origin deployment)', () => {
    beforeEach(() => {
      mockApiUrl = '';
    });

    it('builds an absolute bulk data url from the current origin', () => {
      render(<BringButton ids={['a', 'b']} />);
      const url = bringUrlParam(screen.getByRole('link').getAttribute('href') ?? '');
      expect(url).toBe(`${window.location.origin}/api/bring-bulk?ids=a,b`);
      expect(url.startsWith('/api')).toBe(false);
    });

    it('builds an absolute single-recipe data url from the current origin', () => {
      render(<BringButton recipeId="r1" />);
      const url = bringUrlParam(screen.getByRole('link').getAttribute('href') ?? '');
      expect(url).toBe(`${window.location.origin}/api/bring-recipe/r1`);
      expect(url.startsWith('/api')).toBe(false);
    });
  });
});
