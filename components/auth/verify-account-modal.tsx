'use client';

import { useState, useEffect } from 'react';

export default function VerifyAccountModal({
  isOpen,
  onClose,
  onVerified,
}: {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');
  const [status, setStatus] = useState<{
    email: string;
    phone: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.emailVerified && !data.phoneVerified) {
          setActiveTab('phone');
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setOtpSent(false);
      setOtpCode('');
      setError(null);
      setSuccessMsg(null);
      setPreviewCode(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSendOtp() {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const type =
      activeTab === 'email' ? 'EMAIL_VERIFICATION' : 'PHONE_VERIFICATION';

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send verification code.');
        return;
      }

      setOtpSent(true);
      setSuccessMsg(data.message);
      if (data.previewCode) {
        setPreviewCode(data.previewCode);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const type =
      activeTab === 'email' ? 'EMAIL_VERIFICATION' : 'PHONE_VERIFICATION';

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode, type }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Invalid verification code.');
        return;
      }

      setSuccessMsg('✓ Verified successfully!');
      fetchStatus();
      if (onVerified) onVerified();
      setTimeout(() => {
        setOtpSent(false);
        setOtpCode('');
      }, 1500);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full bg-zinc-100 p-1.5 text-zinc-400 hover:text-zinc-700"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-xl">
            🛡️
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900">
              Account Verification (OTP)
            </h3>
            <p className="text-xs text-zinc-500">
              Verify your Gmail address and phone number
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-6 flex rounded-xl bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('email');
              setOtpSent(false);
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'email'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            ✉️ Gmail / Email {status?.emailVerified ? '✓' : ''}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('phone');
              setOtpSent(false);
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'phone'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            📱 Phone Number {status?.phoneVerified ? '✓' : ''}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
          </div>
        ) : (
          <div className="mt-6">
            {activeTab === 'email' ? (
              <div>
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 text-xs">
                  <div>
                    <p className="text-zinc-500">Gmail / Email Address:</p>
                    <p className="font-bold text-zinc-900">{status?.email}</p>
                  </div>
                  {status?.emailVerified ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      Verified ✓
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                      Unverified
                    </span>
                  )}
                </div>

                {status?.emailVerified ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-800">
                    ✓ Your Gmail address is fully verified and secure.
                  </div>
                ) : (
                  <div className="mt-4">
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={submitting}
                        className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {submitting
                          ? 'Sending Code…'
                          : 'Send 6-Digit OTP to Gmail →'}
                      </button>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                        <p className="text-xs text-zinc-600">
                          Enter the 6-digit verification code sent to{' '}
                          <strong>{status?.email}</strong>:
                        </p>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="• • • • • •"
                          className="w-full rounded-xl border border-zinc-300 bg-white py-3 text-center font-mono text-2xl font-bold tracking-widest text-zinc-900 outline-none focus:border-zinc-900"
                        />
                        {previewCode && (
                          <p className="rounded-lg bg-amber-50 p-2 text-center text-xs font-mono text-amber-800">
                            Demo fallback OTP code: <strong>{previewCode}</strong>
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={submitting || otpCode.length !== 6}
                          className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {submitting ? 'Verifying…' : 'Verify Email Code ✓'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-center text-xs font-semibold text-zinc-500 hover:text-zinc-900"
                        >
                          Resend Code
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 text-xs">
                  <div>
                    <p className="text-zinc-500">Phone Number:</p>
                    <p className="font-bold text-zinc-900">
                      {status?.phone || 'No phone number set'}
                    </p>
                  </div>
                  {status?.phoneVerified ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      Verified ✓
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                      Unverified
                    </span>
                  )}
                </div>

                {status?.phoneVerified ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-800">
                    ✓ Your phone number is verified and secure.
                  </div>
                ) : !status?.phone ? (
                  <p className="mt-4 text-xs text-zinc-500">
                    Please add a phone number in your account settings before verifying.
                  </p>
                ) : (
                  <div className="mt-4">
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={submitting}
                        className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {submitting ? 'Sending SMS…' : 'Send 6-Digit SMS OTP →'}
                      </button>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                        <p className="text-xs text-zinc-600">
                          Enter the 6-digit SMS code sent to{' '}
                          <strong>{status?.phone}</strong>:
                        </p>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="• • • • • •"
                          className="w-full rounded-xl border border-zinc-300 bg-white py-3 text-center font-mono text-2xl font-bold tracking-widest text-zinc-900 outline-none focus:border-zinc-900"
                        />
                        {previewCode && (
                          <p className="rounded-lg bg-amber-50 p-2 text-center text-xs font-mono text-amber-800">
                            Demo fallback SMS OTP: <strong>{previewCode}</strong>
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={submitting || otpCode.length !== 6}
                          className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {submitting ? 'Verifying…' : 'Verify Phone Code ✓'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-center text-xs font-semibold text-zinc-500 hover:text-zinc-900"
                        >
                          Resend SMS
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-600">
                {error}
              </p>
            )}

            {successMsg && (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
                {successMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
