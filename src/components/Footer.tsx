import { Phone, Mail, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useRouter } from '@/context/RouterContext';

export function Footer() {
  const { navigate } = useRouter();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-navy-800 bg-navy-700 text-navy-100">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo variant="light" />
            <p className="max-w-xs text-sm leading-relaxed text-navy-200">
              Your trusted mechanic, wherever you are. Bringing professional car repair and servicing to your doorstep across Pakistan.
            </p>
            <div className="flex gap-3">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-600 text-navy-100 transition-colors hover:bg-orange-500 hover:text-white" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-600 text-navy-100 transition-colors hover:bg-orange-500 hover:text-white" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-600 text-navy-100 transition-colors hover:bg-orange-500 hover:text-white" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Services</h4>
            <ul className="space-y-2.5 text-sm text-navy-200">
              <li><button onClick={() => navigate('/#services')} className="transition-colors hover:text-orange-400">General Inspection</button></li>
              <li><button onClick={() => navigate('/#services')} className="transition-colors hover:text-orange-400">Engine Diagnostics</button></li>
              <li><button onClick={() => navigate('/#services')} className="transition-colors hover:text-orange-400">Battery Replacement</button></li>
              <li><button onClick={() => navigate('/#services')} className="transition-colors hover:text-orange-400">Oil Change</button></li>
              <li><button onClick={() => navigate('/#services')} className="transition-colors hover:text-orange-400">Roadside Assistance</button></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Company</h4>
            <ul className="space-y-2.5 text-sm text-navy-200">
              <li><button onClick={() => navigate('/#how-it-works')} className="transition-colors hover:text-orange-400">How It Works</button></li>
              <li><button onClick={() => navigate('/mechanic/register')} className="transition-colors hover:text-orange-400">Become a Mechanic</button></li>
              <li><button onClick={() => navigate('/signup')} className="transition-colors hover:text-orange-400">Sign Up</button></li>
              <li><button onClick={() => navigate('/login')} className="transition-colors hover:text-orange-400">Login</button></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Contact</h4>
            <ul className="space-y-3 text-sm text-navy-200">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-orange-400" />
                <span>+92 300 1234567</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-orange-400" />
                <span>support@gaarifix.pk</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-orange-400" />
                <span>Suite 12, Shahrah-e-Faisal, Karachi, Pakistan</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-navy-600 pt-6 text-xs text-navy-300 sm:flex-row">
          <p>&copy; {year} GaariFix. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-orange-400">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-orange-400">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
