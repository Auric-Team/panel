import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
      <div className="ref-card max-w-md w-full p-8 text-center space-y-4 shadow-xl">
        <div className="ref-dialog-icon text-danger">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="font-display text-2xl font-normal text-ink">404 &mdash; Page Not Found</h2>
        <p className="text-muted text-xs">
          The requested control center endpoint does not exist or has been relocated.
        </p>
        <Link
          href="/"
          className="ref-btn ref-btn-primary inline-flex items-center space-x-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Control Center</span>
        </Link>
      </div>
    </div>
  );
}
