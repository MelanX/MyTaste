import React from 'react';
import { render } from '@testing-library/react';
import ImageUpload from '../components/ImageUpload';

describe('ImageUpload', () => {
  it('renders a file input', () => {
    const { container } = render(<ImageUpload file={null} onFile={vi.fn()} url="" onUrl={vi.fn()} />);
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it('shows the placeholder image when no url or preview is set', () => {
    const { container } = render(<ImageUpload file={null} onFile={vi.fn()} url="" onUrl={vi.fn()} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/placeholder.webp');
  });

  it('shows the provided url as the preview image', () => {
    const { container } = render(<ImageUpload file={null} onFile={vi.fn()} url="https://example.com/pic.jpg" onUrl={vi.fn()} />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/pic.jpg');
  });
});
