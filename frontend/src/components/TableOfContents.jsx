'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function useActiveHeading(ids) {
  const [activeId, setActiveId] = useState(ids[0] ?? null);
  const visible = useRef(new Map());

  useEffect(() => {
    if (!ids.length) return;
    visible.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.current.set(entry.target.id, entry.isIntersecting);
        }
        const first = ids.find((id) => visible.current.get(id));
        if (first) setActiveId(first);
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 }
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}

export default function TableOfContents({ items, title = 'On this page', ariaLabel = 'Contents' }) {
  const ids = useMemo(() => items.map((h) => h.id), [items]);
  const activeId = useActiveHeading(ids);

  function goTo(event, id) {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  }

  if (!items.length) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className="hidden border-l border-metal-100 pl-5 lg:sticky lg:top-0 lg:block lg:max-h-[calc(100vh-11rem)] lg:self-start lg:overflow-y-auto"
    >
      <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-wider text-metal-500">{title}</p>
      <ul className="space-y-0.5">
        {items.map((heading) => (
          <li key={heading.id} style={{ paddingLeft: `${(heading.level - 2) * 14}px` }}>
            <a
              href={`#${heading.id}`}
              onClick={(e) => goTo(e, heading.id)}
              aria-current={activeId === heading.id ? 'location' : undefined}
              className={`-ml-px block border-l-2 py-1 pl-3 text-sm leading-snug transition-colors duration-150 ${
                activeId === heading.id
                  ? 'border-blueberry-900 font-semibold text-blueberry-900'
                  : 'border-transparent text-metal-500 hover:text-blueberry-900'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
