import Link from 'next/link';
import NewOwnerForm from './new-owner-form';

export default function NewOwnerPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/owners"
        className="text-sm text-[#E8E8F2] transition-colors hover:text-white"
      >
        ← Back to Property Owners
      </Link>

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Add Property Owner
        </h1>
        <p className="mt-1 mb-6 text-sm text-[#E8E8F2]">
          Creates a new user with the OWNER role.
        </p>
        <NewOwnerForm />
      </div>
    </div>
  );
}
