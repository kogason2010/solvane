import { createElement, type ElementType } from 'react';

interface Props {
  text: string;
  as?: ElementType;
  className?: string;
  id?: string;
}

/**
 * Wraps each word in a mask so it can slide up into view (see useReveal).
 * The accessible name stays the plain sentence via aria-label.
 */
export function SplitText({ text, as = 'span', className, id }: Props) {
  const words = text.split(' ');
  return createElement(
    as,
    { className, id, 'aria-label': text, 'data-split': '' },
    words.map((w, i) => (
      <span className="split-word" key={i} aria-hidden="true">
        <span>{w}</span>
        {i < words.length - 1 ? ' ' : ''}
      </span>
    )),
  );
}
