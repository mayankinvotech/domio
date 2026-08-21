// Client helper: POST to a report endpoint and trigger a PDF download.
export async function downloadReport(
  endpoint: string,
  body: object,
  filename: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    return { ok: false, error: j?.error ?? 'Failed to generate report.' };
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
export function monthsAgoStr(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}
