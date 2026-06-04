import React from 'react';

// Tokenizes inline markdown into React nodes (recursive, handles nesting).
// Supported: ***bold+italic***, __underline__, **bold**, *italic*, _italic_
// Lookaheads prevent * from matching inside ** and _ from matching inside __.
export default function renderInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const pattern = /(\*\*\*(.+?)\*\*\*)|(__(.+?)__)|(\*\*(.+?)\*\*)|(\*(?!\*)(.+?)(?<!\*)\*(?!\*))|(_(?!_)(.+?)(?<!_)_(?!_))/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    // Groups: 1=tristar, 2=tristarContent, 3=ul, 4=ulContent,
    //         5=bold, 6=boldContent, 7=star(outer), 8=starContent,
    //         9=under(outer), 10=underContent
    const [, tristar, tristarContent, ul, ulContent, bold, boldContent, , starContent, , underContent] = match;
    const key = keyIndex++;

    if (tristar) {
      nodes.push(
        <strong key={key}>
          <em>{renderInlineMarkdown(tristarContent)}</em>
        </strong>,
      );
    } else if (ul) {
      nodes.push(<u key={key}>{renderInlineMarkdown(ulContent)}</u>);
    } else if (bold) {
      nodes.push(<strong key={key}>{renderInlineMarkdown(boldContent)}</strong>);
    } else if (starContent !== undefined) {
      nodes.push(<em key={key}>{renderInlineMarkdown(starContent)}</em>);
    } else if (underContent !== undefined) {
      nodes.push(<em key={key}>{renderInlineMarkdown(underContent)}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
