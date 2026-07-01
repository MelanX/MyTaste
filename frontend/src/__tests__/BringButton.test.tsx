import React from 'react';
import { render, screen } from '@testing-library/react';
import BringButton from '../components/BringButton';

vi.mock('../config', () => ({ getConfig: () => ({ API_URL: 'https://api.example' }) }));
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
});
