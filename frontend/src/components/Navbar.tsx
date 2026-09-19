'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/Feedback';
import { LinkButton } from '@/components/ui/Button';
import { IconLogOut, IconMenu, IconMountain, IconPlus, IconSettings, IconShield, IconUser, IconX } from '@/components/ui/Icons';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menüs bei Seitenwechsel schließen
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Klick außerhalb und Esc schließen das Nutzermenü
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await logout();
    router.push('/login');
  };

  const linkClass = (href: string) =>
    `rounded-full px-3.5 py-1.5 text-subhead transition-colors ${
      pathname === href ? 'bg-fill/15 font-medium text-label' : 'text-secondary hover:text-label'
    }`;

  return (
    <header className="glass sticky top-0 z-50 border-b border-line/60">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        Zum Inhalt springen
      </a>
      <nav aria-label="Hauptnavigation" className="mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-full py-1 pr-2 text-headline">
          <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem] bg-accent text-white dark:text-black">
            <IconMountain size={19} />
          </span>
          <span className="tracking-tight">Reiseplaner</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {user && (
            <>
              <Link href="/" className={linkClass('/')}>
                Meine Trips
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className={linkClass('/admin')}>
                  Verwaltung
                </Link>
              )}
              <LinkButton href="/trips/create" size="sm" icon={<IconPlus size={16} />} className="ml-2">
                Neuer Trip
              </LinkButton>
              <div ref={menuRef} className="relative ml-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Kontomenü"
                  className="rounded-full transition hover:opacity-80"
                >
                  <Avatar name={user.name ?? user.email} size={34} />
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-3 w-64 origin-top-right animate-scale-in overflow-hidden rounded-card bg-elevated p-1.5 shadow-lift ring-1 ring-line/60"
                  >
                    <div className="px-3 py-2.5">
                      <p className="truncate text-subhead font-semibold">{user.name ?? 'Konto'}</p>
                      <p className="truncate text-footnote text-secondary">{user.email}</p>
                    </div>
                    <div className="hairline my-1" />
                    <Link
                      href="/account"
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-control px-3 py-2.5 text-subhead transition hover:bg-fill/12"
                    >
                      <IconSettings size={18} className="text-secondary" /> Konto &amp; Passwort
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-subhead transition hover:bg-fill/12"
                    >
                      <IconLogOut size={18} className="text-secondary" /> Abmelden
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          {!user && !loading && (
            <LinkButton href="/login" size="sm">
              Anmelden
            </LinkButton>
          )}
        </div>

        {/* Mobil */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-label transition hover:bg-fill/12 md:hidden"
          aria-label={mobileOpen ? 'Menü schließen' : 'Menü öffnen'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <IconX size={22} /> : <IconMenu size={22} />}
        </button>
      </nav>

      {mobileOpen && (
        <div id="mobile-menu" className="animate-fade-in border-t border-line/60 px-4 pb-5 pt-3 md:hidden">
          {user ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 px-2 pb-3">
                <Avatar name={user.name ?? user.email} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-subhead font-semibold">{user.name ?? 'Konto'}</p>
                  <p className="truncate text-footnote text-secondary">{user.email}</p>
                </div>
              </div>
              <MobileLink href="/" icon={<IconMountain size={20} />}>
                Meine Trips
              </MobileLink>
              <MobileLink href="/trips/create" icon={<IconPlus size={20} />}>
                Neuer Trip
              </MobileLink>
              {user.role === 'admin' && (
                <MobileLink href="/admin" icon={<IconShield size={20} />}>
                  Verwaltung
                </MobileLink>
              )}
              <MobileLink href="/account" icon={<IconUser size={20} />}>
                Konto &amp; Passwort
              </MobileLink>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-control px-3 py-3 text-left text-body text-danger transition hover:bg-fill/12"
              >
                <IconLogOut size={20} /> Abmelden
              </button>
            </div>
          ) : (
            <LinkButton href="/login" fullWidth>
              Anmelden
            </LinkButton>
          )}
        </div>
      )}
    </header>
  );
}

function MobileLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-control px-3 py-3 text-body transition hover:bg-fill/12">
      <span className="text-secondary">{icon}</span>
      {children}
    </Link>
  );
}
