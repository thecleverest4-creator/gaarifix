import { BadgeCheck, Briefcase, MapPin, Wrench } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { SPECIALIZATION_OPTIONS } from '@/lib/constants';
import { initials, type PublicMechanic } from '@/lib/mechanics';
import { Stars } from '@/components/Stars';
import { isDemoMechanic } from '@/lib/demoMechanics';

export function MechanicCard({ m, service }: { m: PublicMechanic; service?: string }) {
  const { navigate } = useRouter();
  const specLabel = (slug: string) => SPECIALIZATION_OPTIONS.find((s) => s.slug === slug)?.label ?? slug;
  // A sample mechanic can't take a booking, so it becomes an open request any real mechanic can accept.
  const bookUrl = isDemoMechanic(m)
    ? `/book${service ? `?service=${service}` : ''}`
    : `/book?mechanic=${m.user_id}${service ? `&service=${service}` : ''}`;
  return (
    <div className="card flex flex-col p-5 hover:shadow-cardHover">
      <div className="flex items-start gap-4">
        {m.profile_photo_url ? (
          <img src={m.profile_photo_url} alt={m.full_name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-orange-200 bg-orange-50 text-xl font-bold text-navy-700">
            {initials(m.full_name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-semibold text-navy-700">
            <span className="leading-snug">{m.workshop_name || m.full_name}</span>
            {!isDemoMechanic(m) && <BadgeCheck className="h-4 w-4 shrink-0 text-orange-500" aria-label="Verified" />}
          </p>
          {m.workshop_name && <p className="truncate text-xs text-navy-400">{m.full_name}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Stars value={m.rating_avg} />
            <b className="text-navy-700">{Number(m.rating_avg).toFixed(1)}</b>
            <span className="text-navy-300">({m.rating_count})</span>
          </p>
          <span className={`badge mt-1.5 ${m.is_available ? 'bg-navy-700 text-white' : 'bg-gray-100 text-navy-400'}`}>
            {m.is_available ? 'Available' : 'Busy'}
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-1.5 text-sm text-navy-500">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-orange-500" /> {m.city}
          {m.service_areas.length > 0 && <span className="truncate text-navy-400">· {m.service_areas.slice(0, 3).join(', ')}</span>}
        </p>
        <p className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-orange-500" /> {m.years_experience} yrs experience · {m.total_jobs} jobs done
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(m.specializations.length ? m.specializations : ['general-inspection']).slice(0, 4).map((s) => (
          <span key={s} className={`badge ${s === service ? 'bg-orange-500 text-white' : 'bg-navy-50 text-navy-600'}`}>
            <Wrench className="h-3 w-3" /> {specLabel(s)}
          </span>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
        <button onClick={() => navigate(`/mechanics/${m.id}`)} className="btn-outline px-3 py-2.5">
          View profile
        </button>
        <button onClick={() => navigate(bookUrl)} className="btn-primary px-3 py-2.5">
          Book
        </button>
      </div>
    </div>
  );
}
