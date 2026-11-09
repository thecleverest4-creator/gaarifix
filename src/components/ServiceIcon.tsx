import {
  Wrench, SearchCheck, Gauge, BatteryCharging, Droplets,
  Disc, Snowflake, CircleDot, Siren, type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Wrench,
  SearchCheck,
  Gauge,
  BatteryCharging,
  Droplets,
  Disc,
  Snowflake,
  CircleDot,
  Siren,
};

export function ServiceIcon({ name, className = 'h-6 w-6' }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon className={className} />;
}
