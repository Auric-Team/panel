import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-mono text-xs">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">404 - Page Not Found</h2>
        <p className="text-slate-400 text-xs">
          The requested control center endpoint does not exist or has been relocated.
        </p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-xl transition border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Executive Control Center</span>
        </Link>
      </div>
    </div>
  );
}
