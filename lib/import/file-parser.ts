import * as XLSX from 'xlsx';

export interface ParsedFileData {
  headers: string[];
  rows: Record<string, unknown>[];
  rawText: string;
  sheetNames?: string[];
  fileType: string;
}

export async function parseUploadedFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ParsedFileData> {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get raw data preserving all values.
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
    }) as unknown[][];

    // Convert to a CSV-ish text representation for Claude.
    const rawText = XLSX.utils.sheet_to_csv(sheet);

    return {
      headers: (rows[0] ?? []).map(String),
      rows: rows.slice(1).map((row, i) => ({ rowIndex: i + 2, values: row })),
      rawText,
      sheetNames: workbook.SheetNames,
      fileType: ext,
    };
  }

  if (ext === 'csv') {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n');
    return {
      headers: lines[0]?.split(',') ?? [],
      rows: lines
        .slice(1)
        .map((line, i) => ({ rowIndex: i + 2, values: line.split(',') })),
      rawText: text,
      fileType: 'csv',
    };
  }

  // Plain text fallback.
  const text = buffer.toString('utf-8');
  return {
    headers: [],
    rows: [],
    rawText: text,
    fileType: ext ?? 'txt',
  };
}
