import React from 'react';

/**
 * Parse inline markdown formatting and return React elements
 * Handles: **bold**, *italic*, [links](url), `code`
 */
export function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;

  // Regex patterns for inline markdown
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },           // **bold**
    { regex: /__([^_]+)__/g, type: 'bold' },               // __bold__
    { regex: /\*([^*]+)\*/g, type: 'italic' },             // *italic*
    { regex: /_([^_]+)_/g, type: 'italic' },               // _italic_
    { regex: /`([^`]+)`/g, type: 'code' },                 // `code`
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },   // [text](url)
  ];

  // Find all matches in order
  const matches: Array<{
    index: number;
    length: number;
    type: string;
    content: string;
    url?: string;
  }> = [];

  patterns.forEach(({ regex, type }) => {
    const re = new RegExp(regex.source, 'g');
    let match;
    while ((match = re.exec(text)) !== null) {
      if (type === 'link') {
        matches.push({
          index: match.index,
          length: match[0].length,
          type,
          content: match[1],
          url: match[2],
        });
      } else {
        matches.push({
          index: match.index,
          length: match[0].length,
          type,
          content: match[1],
        });
      }
    }
  });

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Remove overlapping matches (keep first)
  const filteredMatches = matches.filter((match, idx) => {
    if (idx === 0) return true;
    const prev = matches[idx - 1];
    return match.index >= prev.index + prev.length;
  });

  // Build elements
  filteredMatches.forEach((match) => {
    // Add text before match
    if (match.index > currentIndex) {
      elements.push(
        <span key={key++}>{text.substring(currentIndex, match.index)}</span>
      );
    }

    // Add formatted element
    switch (match.type) {
      case 'bold':
        elements.push(
          <strong key={key++} className="font-bold text-textPrimary">
            {match.content}
          </strong>
        );
        break;
      case 'italic':
        elements.push(
          <em key={key++} className="italic">
            {match.content}
          </em>
        );
        break;
      case 'code':
        elements.push(
          <code
            key={key++}
            className="px-1.5 py-0.5 bg-gray-200 text-gray-800 rounded text-xs font-mono"
          >
            {match.content}
          </code>
        );
        break;
      case 'link':
        elements.push(
          <a
            key={key++}
            href={match.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            {match.content}
          </a>
        );
        break;
    }

    currentIndex = match.index + match.length;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    elements.push(<span key={key++}>{text.substring(currentIndex)}</span>);
  }

  return elements.length > 0 ? elements : [text];
}

/**
 * Render a paragraph with inline markdown support
 */
export function MarkdownParagraph({
  children,
  className = '',
}: {
  children: string;
  className?: string;
  key?: React.Key;
}) {
  return <p className={className}>{parseInlineMarkdown(children)}</p>;
}

/**
 * Render a list item with inline markdown support
 */
export function MarkdownListItem({
  children,
  className = '',
}: {
  children: string;
  className?: string;
  key?: React.Key;
}) {
  return <li className={className}>{parseInlineMarkdown(children)}</li>;
}

/**
 * Render a heading with inline markdown support
 */
export function MarkdownHeading({
  level,
  children,
  className = '',
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: string;
  className?: string;
  key?: React.Key;
}) {
  const content = parseInlineMarkdown(children);
  
  switch (level) {
    case 1:
      return <h1 className={className}>{content}</h1>;
    case 2:
      return <h2 className={className}>{content}</h2>;
    case 3:
      return <h3 className={className}>{content}</h3>;
    case 4:
      return <h4 className={className}>{content}</h4>;
    case 5:
      return <h5 className={className}>{content}</h5>;
    case 6:
      return <h6 className={className}>{content}</h6>;
    default:
      return <h2 className={className}>{content}</h2>;
  }
}
