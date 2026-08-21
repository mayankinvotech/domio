import ResetPasswordForm from './reset-password-form';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#0A0A0F] px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-40 h-[500px] w-[500px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(0,0,0,0.06) 0%, transparent 65%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(232,160,32,0.10) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl font-black tracking-[0.25em] text-[#E8A020]">
            DOMIO
          </span>
        </div>

        <div className="rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-xl">
          <div className="mb-6 flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Reset password
            </h1>
            <p className="text-sm text-[#E8E8F2]">
              Choose a new password for your Domio account.
            </p>
          </div>
          <ResetPasswordForm token={token ?? ''} />
        </div>
      </div>
    </div>
  );
}
