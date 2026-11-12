import { Star } from 'lucide-react';

export function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${Number(value).toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(Number(value)) ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`} />
      ))}
    </span>
  );
}
