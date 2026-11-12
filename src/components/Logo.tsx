import { Wrench } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';

interface LogoProps {
  variant?: 'light' | 'dark';
  onClick?: () => void;
}

export function Logo({ variant = 'dark', onClick }: LogoProps) {
  const { navigate } = useRouter();
  const textColor = variant === 'light' ? 'text-white' : 'text-navy-700';
  return (
    <button
      onClick={onClick ?? (() => navigate('/'))}
      className="flex items-center gap-2.5 group"
      aria-label="GaariFix home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm transition-transform group-hover:scale-105">
        <Wrench className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className={`text-lg font-bold tracking-tight ${textColor}`}>
        Gaari<span className="text-orange-500">Fix</span>
      </span>
    </button>
  );
}
