import { useState } from 'react';
import { Car, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FUEL_TYPES } from '@/lib/constants';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import type { Vehicle, FuelType } from '@/types';

interface VehicleFormProps {
  onSaved: (vehicle: Vehicle) => void;
  onCancel?: () => void;
  existing?: Vehicle | null;
}

const POPULAR_MAKES = ['Toyota', 'Suzuki', 'Honda', 'Hyundai', 'KIA', 'Nissan', 'Mitsubishi', 'Daihatsu', 'Changan', 'DFSK'];

export function VehicleForm({ onSaved, onCancel, existing }: VehicleFormProps) {
  const { user } = useAuth();
  const [make, setMake] = useState(existing?.make ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [year, setYear] = useState(existing?.year ? String(existing.year) : '');
  const [registration, setRegistration] = useState(existing?.registration_number ?? '');
  const [fuelType, setFuelType] = useState<FuelType>(existing?.fuel_type ?? 'Petrol');
  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const yearNum = parseInt(year, 10);
    if (!make || !model || !registration) {
      setError('Make, model and registration number are required.');
      return;
    }
    if (isNaN(yearNum) || yearNum < 1980 || yearNum > new Date().getFullYear() + 1) {
      setError('Please enter a valid year (1980–present).');
      return;
    }
    setLoading(true);

    const payload = {
      user_id: user!.id,
      make: make.trim(),
      model: model.trim(),
      year: yearNum,
      registration_number: registration.trim().toUpperCase(),
      fuel_type: fuelType,
      nickname: nickname.trim() || null,
    };

    let result;
    if (existing) {
      result = await supabase.from('vehicles').update(payload).eq('id', existing.id).select().single();
    } else {
      result = await supabase.from('vehicles').insert(payload).select().single();
    }
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    onSaved(result.data as Vehicle);
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-navy-700">
          {existing ? <Car className="h-5 w-5 text-orange-500" /> : <Plus className="h-5 w-5 text-orange-500" />}
          {existing ? 'Edit vehicle' : 'Add a vehicle'}
        </h3>
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg p-1.5 text-navy-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-text">Make</label>
          <input list="makes-list" required value={make} onChange={(e) => setMake(e.target.value)} className="input-field" placeholder="e.g. Toyota" />
          <datalist id="makes-list">
            {POPULAR_MAKES.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>
        <div>
          <label className="label-text">Model</label>
          <input required value={model} onChange={(e) => setModel(e.target.value)} className="input-field" placeholder="e.g. Corolla GLi" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Year</label>
            <input type="number" required value={year} onChange={(e) => setYear(e.target.value)} className="input-field" placeholder="2020" />
          </div>
          <div>
            <label className="label-text">Fuel type</label>
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)} className="input-field">
              {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label-text">Registration number</label>
          <input required value={registration} onChange={(e) => setRegistration(e.target.value)} className="input-field uppercase" placeholder="ABC-123" />
        </div>
        <div>
          <label className="label-text">Nickname (optional)</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="input-field" placeholder="e.g. My daily car" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? <Spinner className="h-4 w-4" /> : existing ? 'Save changes' : 'Add vehicle'}
          </button>
          {onCancel && <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>}
        </div>
      </form>
    </div>
  );
}
