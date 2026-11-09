import type { BookingStatus, VerificationStatus } from '@/types';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES, VERIFICATION_LABELS, VERIFICATION_STYLES } from '@/lib/constants';

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`badge ${BOOKING_STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={`badge ${VERIFICATION_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {VERIFICATION_LABELS[status]}
    </span>
  );
}
