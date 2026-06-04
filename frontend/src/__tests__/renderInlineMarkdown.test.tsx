import React from 'react';
import { render } from '@testing-library/react';
import renderInlineMarkdown from '../utils/renderInlineMarkdown';

function renderNodes(text: string) {
  return render(<span>{renderInlineMarkdown(text)}</span>);
}

describe('renderInlineMarkdown', () => {
  it('renders plain text unchanged', () => {
    const { container } = renderNodes('Hallo Welt');
    expect(container.textContent).toBe('Hallo Welt');
    expect(container.querySelector('strong, em, u')).toBeNull();
  });

  it('renders **text** as bold', () => {
    const { container } = renderNodes('**fett**');
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe('fett');
  });

  it('renders *text* as italic', () => {
    const { container } = renderNodes('*kursiv*');
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em!.textContent).toBe('kursiv');
  });

  it('renders _text_ as italic', () => {
    const { container } = renderNodes('_kursiv_');
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em!.textContent).toBe('kursiv');
  });

  it('renders __text__ as underlined', () => {
    const { container } = renderNodes('__unterstrichen__');
    const u = container.querySelector('u');
    expect(u).not.toBeNull();
    expect(u!.textContent).toBe('unterstrichen');
  });

  it('renders mixed markers correctly', () => {
    const { container } = renderNodes('**fett** und *kursiv*');
    expect(container.querySelector('strong')!.textContent).toBe('fett');
    expect(container.querySelector('em')!.textContent).toBe('kursiv');
    expect(container.textContent).toBe('fett und kursiv');
  });

  it('**bold** takes precedence over _italic_ when nested would be ambiguous', () => {
    const { container } = renderNodes('__unter__ und **fett**');
    expect(container.querySelector('u')!.textContent).toBe('unter');
    expect(container.querySelector('strong')!.textContent).toBe('fett');
  });

  it('unmatched markers render as plain text', () => {
    const { container } = renderNodes('nur *ein Stern');
    expect(container.textContent).toBe('nur *ein Stern');
    expect(container.querySelector('em')).toBeNull();
  });

  it('empty string returns empty array', () => {
    const result = renderInlineMarkdown('');
    expect(result).toHaveLength(0);
  });

  it('text with no markers has no wrapper elements', () => {
    const { container } = renderNodes('Einfacher Text ohne Formatierung');
    expect(container.querySelector('strong, em, u')).toBeNull();
  });

  it('renders nested *__**text**__* as italic+underline+bold', () => {
    const { container } = renderNodes('*__**Konsistenz**__*');
    expect(container.querySelector('em')).not.toBeNull();
    expect(container.querySelector('em u')).not.toBeNull();
    expect(container.querySelector('em u strong')).not.toBeNull();
    expect(container.textContent).toBe('Konsistenz');
  });

  it('renders **__bold underlined__** correctly', () => {
    const { container } = renderNodes('**__fett unterstrichen__**');
    expect(container.querySelector('strong u')).not.toBeNull();
    expect(container.textContent).toBe('fett unterstrichen');
  });

  it('* does not match inside ** markers', () => {
    const { container } = renderNodes('**fett**');
    expect(container.querySelector('strong')!.textContent).toBe('fett');
    expect(container.querySelector('em')).toBeNull();
  });

  it('renders ***text*** as bold+italic', () => {
    const { container } = renderNodes('***fett kursiv***');
    expect(container.querySelector('strong em')).not.toBeNull();
    expect(container.textContent).toBe('fett kursiv');
  });

  it('renders ***__text__*** as bold+italic+underline', () => {
    const { container } = renderNodes('***__schneiden__***');
    expect(container.querySelector('strong em u')).not.toBeNull();
    expect(container.textContent).toBe('schneiden');
  });
});
