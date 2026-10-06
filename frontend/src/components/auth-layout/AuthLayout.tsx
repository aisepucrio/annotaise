'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import React from 'react';

type AuthLayoutProps = {
  title: string | undefined;
  subtitle: string | undefined;
  children: React.ReactNode;
};

/** Each snippet is a stack of text-like bars; `marked` is the line that got highlighted. */
const SNIPPETS = [
  { position: 'left-[6%] top-[14%] -rotate-2', widths: ['w-full', 'w-5/6', 'w-2/3'], marked: 1 },
  { position: 'right-[8%] top-[10%] rotate-1', widths: ['w-4/5', 'w-full', 'w-1/2'], marked: 0 },
  { position: 'left-[12%] bottom-[16%] rotate-1', widths: ['w-2/3', 'w-full', 'w-3/4'], marked: 2 },
  { position: 'right-[6%] bottom-[12%] -rotate-1', widths: ['w-full', 'w-1/2', 'w-5/6'], marked: 1 },
  { position: 'left-[2%] top-[46%] rotate-1', widths: ['w-3/4', 'w-full'], marked: 0 },
  { position: 'right-[3%] top-[52%] -rotate-1', widths: ['w-full', 'w-2/3'], marked: 1 },
];

const DOTS = 'radial-gradient(var(--metal-200) 1.2px, transparent 1.2px)';
/** Keeps the dots off the card and fades them into the edges. */
const FADE = 'radial-gradient(ellipse 55% 45% at 50% 50%, transparent 25%, #000 75%)';

/** Decorative only: a dotted sheet with a few annotated snippets around the card. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: DOTS, backgroundSize: '22px 22px', maskImage: FADE, WebkitMaskImage: FADE }}
      />

      {SNIPPETS.map(({ position, widths, marked }, index) => (
        <div key={index} className={`absolute hidden w-40 flex-col gap-2 lg:flex ${position}`}>
          {widths.map((width, line) => (
            <div key={line} className="flex items-center gap-2">
              <span className={`h-1.5 rounded-full ${width} ${line === marked ? 'bg-blueberry-500/25' : 'bg-metal-200/55'}`} />
              {line === marked && (
                <span className="flex size-3.5 shrink-0 items-center justify-center rounded-sm bg-blueberry-500/20">
                  <Check className="size-2.5 text-blueberry-700/50" strokeWidth={3} />
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Shell for the authentication pages: logo above a single centered card, vertically
 * centered on tall screens and scrolling from the top when the card outgrows the viewport.
 */
export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-8 bg-metal-50 px-4 py-10">
      <Backdrop />

      <Image src="/Full_Logo_Light.svg" alt="Annotaise" width={602} height={56} priority className="relative w-48 sm:w-56" />

      <main className="relative w-full max-w-md rounded-2xl border border-metal-100 bg-white p-6 shadow-sm sm:p-8">
        {title && <h1 className="text-center text-2xl font-semibold tracking-tight text-blueberry-900">{title}</h1>}
        {subtitle && <p className="mt-2 text-center text-sm text-metal-500">{subtitle}</p>}

        {children}
      </main>
    </div>
  );
}
