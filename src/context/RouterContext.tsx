import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface RouterContextValue {
  path: string;
  /** Query string params from the hash, e.g. #/book?mechanic=123 */
  query: URLSearchParams;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function currentHash(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

function currentPath(): string {
  return currentHash().split('?')[0] || '/';
}

function currentQuery(): URLSearchParams {
  return new URLSearchParams(currentHash().split('?')[1] ?? '');
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(currentPath());
  const [query, setQuery] = useState<URLSearchParams>(currentQuery());

  useEffect(() => {
    const onHashChange = () => {
      setPath(currentPath());
      setQuery(currentQuery());
    };
    window.addEventListener('hashchange', onHashChange);
    // ensure a hash exists so navigation works from the start
    if (!window.location.hash) {
      window.location.hash = '/';
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (to: string) => {
    const target = to.startsWith('/') ? to : `/${to}`;
    if (currentHash() === target) {
      // force a re-render even when navigating to the same path
      setPath(target);
      return;
    }
    window.location.hash = target;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  return (
    <RouterContext.Provider value={{ path, query, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

// Minimal path matcher: returns params for a pattern like "/bookings/:id"
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const pp = pattern.split('/').filter(Boolean);
  const ap = path.split('/').filter(Boolean);
  if (pp.length !== ap.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(ap[i]);
    } else if (pp[i] !== ap[i]) {
      return null;
    }
  }
  return params;
}
