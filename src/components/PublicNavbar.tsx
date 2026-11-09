import { useState } from 'react';
import { Menu, X, LogIn, UserPlus } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Services', path: '/#services' },
  { label: 'How It Works', path: '/#how-it-works' },
  { label: 'Become a Mechanic', path: '/mechanic/register' },
];

export function PublicNavbar() {
  const { navigate, path } = useRouter();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  const go = (to: string) => {
    setOpen(false);
    if (to.includes('#')) {
      const [base, anchor] = to.split('#');
      if (path !== base && base) {
        navigate(base);
        setTimeout(() => scrollToAnchor(anchor), 100);
      } else {
        scrollToAnchor(anchor);
      }
    } else {
      navigate(to);
    }
  };

  const scrollToAnchor = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const dashboardPath =
    profile?.role === 'admin' ? '/admin' : profile?.role === 'mechanic' ? '/mechanic/dashboard' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => go(link.path)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-navy-600 transition-colors hover:bg-gray-100 hover:text-navy-800"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {profile ? (
            <button onClick={() => navigate(dashboardPath)} className="btn-outline">
              Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="btn-ghost">
                <LogIn className="h-4 w-4" /> Login
              </button>
              <button onClick={() => navigate('/signup')} className="btn-primary">
                <UserPlus className="h-4 w-4" /> Get Started
              </button>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-navy-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => go(link.path)}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-navy-700 hover:bg-gray-100"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-3">
              {profile ? (
                <button onClick={() => { setOpen(false); navigate(dashboardPath); }} className="btn-outline w-full">
                  Dashboard
                </button>
              ) : (
                <>
                  <button onClick={() => { setOpen(false); navigate('/login'); }} className="btn-outline w-full">
                    <LogIn className="h-4 w-4" /> Login
                  </button>
                  <button onClick={() => { setOpen(false); navigate('/signup'); }} className="btn-primary w-full">
                    <UserPlus className="h-4 w-4" /> Get Started
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
