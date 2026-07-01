import React from 'react';
import { render, screen } from '@testing-library/react';

import CollectionCard from '../components/CollectionCard';

vi.mock('../config', () => ({ getConfig: () => ({ API_URL: 'http://api.test', requireLogin: false }) }));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

const baseCollection = {
  id: 'c1',
  name: 'Sunday Dinners',
  recipeIds: ['r1', 'r2'],
  createdAt: 'x',
  updatedAt: 'x',
};

const recipes = [
  { id: 'r1', title: 'Kuchen', instructions: [], ingredient_sections: [], image: '/uploads/cake.jpg' },
  { id: 'r2', title: 'Brot', instructions: [], ingredient_sections: [], image: 'https://cdn.test/bread.jpg' },
];

describe('CollectionCard', () => {
  it('renders the collection name', () => {
    render(<CollectionCard collection={baseCollection} recipes={recipes} />);
    expect(screen.getByText('Sunday Dinners')).toBeInTheDocument();
  });

  it('shows the pluralized recipe count', () => {
    render(<CollectionCard collection={baseCollection} recipes={recipes} />);
    expect(screen.getByText('2 Rezepte')).toBeInTheDocument();
  });

  it('shows the singular recipe count for one recipe', () => {
    render(<CollectionCard collection={{ ...baseCollection, recipeIds: ['r1'] }} recipes={recipes} />);
    expect(screen.getByText('1 Rezept')).toBeInTheDocument();
  });

  it('links to the collection detail page', () => {
    render(<CollectionCard collection={baseCollection} recipes={recipes} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/collections/c1');
  });

  it('prefixes API_URL for /uploads images', () => {
    render(<CollectionCard collection={baseCollection} recipes={recipes} />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('http://api.test/uploads/cake.jpg');
    expect(img.getAttribute('alt')).toBe('Sunday Dinners');
  });

  it('falls back to the placeholder image when the first recipe is missing', () => {
    render(<CollectionCard collection={{ ...baseCollection, recipeIds: ['missing'] }} recipes={recipes} />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/placeholder.webp');
  });
});
