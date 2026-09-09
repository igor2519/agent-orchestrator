'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/documents', label: 'Workspace' },
  { href: '/documents/all', label: 'All documents' },
] as const;

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-8 px-6">
        <Link className="flex items-center gap-2.5 no-underline" href="/documents">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-[#1f53a6] text-sm font-bold text-white shadow-sm"
          >
            D
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-stone-900">
            Document processing
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            // `/documents` must not light up while `/documents/all` is open.
            const active = pathname === link.href;

            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm no-underline transition-colors ${
                  active
                    ? 'bg-[#1f53a6]/10 font-medium text-[#1f53a6]'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
