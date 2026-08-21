import type { ReactElement } from 'react';

// Renders a report component (each returns a <Document>) to PDF bytes.
// @react-pdf types want a Document element specifically; our wrapper
// components return one, so we cast at this single boundary.
// react-pdf is imported lazily to keep it out of non-report bundles.
export async function renderReportPdf(element: ReactElement): Promise<Blob> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const buffer = await renderToBuffer(
    element as Parameters<typeof renderToBuffer>[0],
  );
  // Wrap as a Blob — a clean BodyInit for the Response.
  return new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
}
