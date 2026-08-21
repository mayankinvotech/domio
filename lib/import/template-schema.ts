import * as XLSX from 'xlsx';

// The Domio import template: each tab has 5 title/header rows (1–5), with data
// starting at row 6. The importer reads positionally by column index, so the
// column ORDER below is the contract shared by the template generator, the
// parser, and the confirm writer.
export const DATA_START_ROW = 5; // 0-indexed → row 6 (1-based)

export interface PortfolioRow {
  name: string;
  type: string;
  description: string;
}
export interface PropertyRow {
  portfolioName: string;
  name: string;
  address: string;
  city: string;
  country: string;
  type: string;
  status: string;
  notes: string;
}
export interface UnitRow {
  propertyName: string;
  unitNumber: string;
  name: string;
  floor: string;
  areaSqft: string;
  rentAmount: string;
  status: string;
  notes: string;
}
export interface TenantRow {
  name: string;
  email: string;
  phone: string;
  nationalId: string;
}
export interface TenancyRow {
  tenantEmail: string;
  propertyName: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDeposit: string;
  paymentDayOfMonth: string;
  status: string;
}
export interface RentPaymentRow {
  tenantEmail: string;
  propertyName: string;
  unitNumber: string;
  period: string;
  dueDate: string;
  amountDue: string;
  amountPaid: string;
  paidDate: string;
  paymentMethod: string;
  status: string;
  notes: string;
}
export interface ExpenseRow {
  propertyName: string;
  category: string;
  amount: string;
  date: string;
  description: string;
}
export interface UtilityAccountRow {
  propertyName: string;
  type: string;
  provider: string;
  accountNumber: string;
  accountRef: string;
  notes: string;
}
export interface UtilityBillRow {
  accountRef: string;
  billDate: string;
  dueDate: string;
  amount: string;
  amountPaid: string;
  paidDate: string;
  status: string;
  notes: string;
}

export interface TemplateData {
  portfolios: PortfolioRow[];
  properties: PropertyRow[];
  units: UnitRow[];
  tenants: TenantRow[];
  tenancies: TenancyRow[];
  rentPayments: RentPaymentRow[];
  expenses: ExpenseRow[];
  utilityAccounts: UtilityAccountRow[];
  utilityBills: UtilityBillRow[];
}

export interface TemplateCounts {
  portfolios: number;
  properties: number;
  units: number;
  tenants: number;
  tenancies: number;
  rentPayments: number;
  expenses: number;
  utilityAccounts: number;
  utilityBills: number;
}

type DataKey = keyof TemplateData;

interface SheetDef {
  dataKey: DataKey;
  sheetName: string;
  // Positional columns (order matters) → object keys.
  keys: string[];
  // Human-readable header labels for the template (row 5).
  headers: string[];
  // Keys that, if ALL empty, mean the row is blank and is skipped; if SOME are
  // empty (but not all), the row is flagged as an error.
  required: string[];
  example: string[];
}

export const SHEET_DEFS: SheetDef[] = [
  {
    dataKey: 'portfolios',
    sheetName: 'Portfolios',
    keys: ['name', 'type', 'description'],
    headers: ['Portfolio Name *', 'Type', 'Description'],
    required: ['name'],
    example: ['Maple Apartments', 'RESIDENTIAL', 'Downtown residential block'],
  },
  {
    dataKey: 'properties',
    sheetName: 'Properties',
    keys: [
      'portfolioName',
      'name',
      'address',
      'city',
      'country',
      'type',
      'status',
      'notes',
    ],
    headers: [
      'Portfolio Name *',
      'Property Name *',
      'Address',
      'City',
      'Country',
      'Type',
      'Status',
      'Notes',
    ],
    required: ['portfolioName', 'name'],
    example: [
      'Maple Apartments',
      '13A',
      '13A Main Street',
      'Mumbai',
      'India',
      'RESIDENTIAL',
      'ACTIVE',
      '',
    ],
  },
  {
    dataKey: 'units',
    sheetName: 'Units',
    keys: [
      'propertyName',
      'unitNumber',
      'name',
      'floor',
      'areaSqft',
      'rentAmount',
      'status',
      'notes',
    ],
    headers: [
      'Property Name *',
      'Unit Number *',
      'Unit Name',
      'Floor',
      'Area (sqft)',
      'Monthly Rent',
      'Status',
      'Notes',
    ],
    required: ['propertyName', 'unitNumber'],
    example: ['13A', 'Flat 1', 'Flat 1', '1', '650', '40000', 'OCCUPIED', ''],
  },
  {
    dataKey: 'tenants',
    sheetName: 'Tenants',
    keys: ['name', 'email', 'phone', 'nationalId'],
    headers: ['Tenant Name *', 'Email', 'Phone', 'National ID'],
    required: ['name'],
    example: ['Vikas Joshi', 'vikas.joshi@example.com', '9990001111', ''],
  },
  {
    dataKey: 'tenancies',
    sheetName: 'Tenancies',
    keys: [
      'tenantEmail',
      'propertyName',
      'unitNumber',
      'startDate',
      'endDate',
      'monthlyRent',
      'securityDeposit',
      'paymentDayOfMonth',
      'status',
    ],
    headers: [
      'Tenant Email *',
      'Property Name *',
      'Unit Number *',
      'Start Date',
      'End Date',
      'Monthly Rent',
      'Security Deposit',
      'Payment Day',
      'Status',
    ],
    required: ['tenantEmail', 'propertyName', 'unitNumber'],
    example: [
      'vikas.joshi@example.com',
      '13A',
      'Flat 1',
      '2024-01-01',
      '2027-12-31',
      '40000',
      '0',
      '1',
      'ACTIVE',
    ],
  },
  {
    dataKey: 'rentPayments',
    sheetName: 'Rent Payments',
    keys: [
      'tenantEmail',
      'propertyName',
      'unitNumber',
      'period',
      'dueDate',
      'amountDue',
      'amountPaid',
      'paidDate',
      'paymentMethod',
      'status',
      'notes',
    ],
    headers: [
      'Tenant Email *',
      'Property Name *',
      'Unit Number *',
      'Period (YYYY-MM) *',
      'Due Date',
      'Amount Due',
      'Amount Paid',
      'Paid Date',
      'Payment Method',
      'Status',
      'Notes',
    ],
    required: ['unitNumber', 'period'],
    example: [
      'vikas.joshi@example.com',
      '13A',
      'Flat 1',
      '2024-01',
      '2024-01-01',
      '40000',
      '40000',
      '2024-01-05',
      'BANK_TRANSFER',
      'PAID',
      '',
    ],
  },
  {
    dataKey: 'expenses',
    sheetName: 'Expenses',
    keys: ['propertyName', 'category', 'amount', 'date', 'description'],
    headers: [
      'Property Name',
      'Category *',
      'Amount *',
      'Date *',
      'Description',
    ],
    required: ['category', 'amount', 'date'],
    example: ['13A', 'MAINTENANCE', '5000', '2024-03-15', 'Plumbing repair'],
  },
  {
    dataKey: 'utilityAccounts',
    sheetName: 'Utility Accounts',
    keys: [
      'propertyName',
      'type',
      'provider',
      'accountNumber',
      'accountRef',
      'notes',
    ],
    headers: [
      'Property Name *',
      'Type *',
      'Provider *',
      'Account Number',
      'Account Ref (for bills)',
      'Notes',
    ],
    required: ['type', 'provider'],
    example: [
      '13A',
      'ELECTRICITY',
      'Adani Power',
      'AP-99812',
      'ELEC-13A',
      '',
    ],
  },
  {
    dataKey: 'utilityBills',
    sheetName: 'Utility Bills',
    keys: [
      'accountRef',
      'billDate',
      'dueDate',
      'amount',
      'amountPaid',
      'paidDate',
      'status',
      'notes',
    ],
    headers: [
      'Account Ref *',
      'Bill Date',
      'Due Date',
      'Amount *',
      'Amount Paid',
      'Paid Date',
      'Status',
      'Notes',
    ],
    required: ['accountRef', 'amount'],
    example: [
      'ELEC-13A',
      '2024-03-01',
      '2024-03-15',
      '2400',
      '2400',
      '2024-03-10',
      'PAID',
      '',
    ],
  },
];

// Normalize a cell to a trimmed string (dates → YYYY-MM-DD).
function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function findSheet(wb: XLSX.WorkBook, name: string): XLSX.WorkSheet | null {
  const target = name.toLowerCase().replace(/\s+/g, '');
  const match = wb.SheetNames.find(
    (n) => n.toLowerCase().replace(/\s+/g, '') === target,
  );
  return match ? wb.Sheets[match] : null;
}

export interface ParseResult {
  data: TemplateData;
  counts: TemplateCounts;
  warnings: string[];
  errors: string[];
}

// Parse an uploaded template workbook into structured data — pure Excel
// parsing, no AI, no DB. Designed to run well under 2 seconds.
export function parseTemplate(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const warnings: string[] = [];
  const errors: string[] = [];
  const data = {
    portfolios: [],
    properties: [],
    units: [],
    tenants: [],
    tenancies: [],
    rentPayments: [],
    expenses: [],
    utilityAccounts: [],
    utilityBills: [],
  } as TemplateData;

  for (const def of SHEET_DEFS) {
    const sheet = findSheet(wb, def.sheetName);
    if (!sheet) {
      warnings.push(`Sheet "${def.sheetName}" not found — skipped.`);
      continue;
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      range: DATA_START_ROW,
      defval: null,
      blankrows: false,
    });

    let rowNum = DATA_START_ROW + 1; // 1-based row for messages
    for (const raw of rows) {
      rowNum++;
      const arr = raw as unknown[];
      const obj: Record<string, string> = {};
      def.keys.forEach((k, i) => {
        obj[k] = cell(arr[i]);
      });

      const filled = def.required.filter((k) => obj[k]);
      if (filled.length === 0) continue; // fully blank → skip silently

      if (filled.length < def.required.length) {
        const missing = def.required.filter((k) => !obj[k]);
        errors.push(
          `${def.sheetName} row ${rowNum}: missing required field(s) ${missing.join(', ')}.`,
        );
        continue;
      }

      (data[def.dataKey] as unknown as Record<string, string>[]).push(obj);
    }
  }

  // Light cross-reference warnings (non-blocking).
  const portfolioNames = new Set(data.portfolios.map((p) => p.name));
  const propertyNames = new Set(data.properties.map((p) => p.name));
  const accountRefs = new Set(
    data.utilityAccounts.map((a) => a.accountRef).filter(Boolean),
  );
  for (const p of data.properties) {
    if (p.portfolioName && !portfolioNames.has(p.portfolioName)) {
      warnings.push(
        `Property "${p.name}" references portfolio "${p.portfolioName}" not in the Portfolios tab — will match an existing portfolio if one exists.`,
      );
    }
  }
  for (const u of data.units) {
    if (u.propertyName && !propertyNames.has(u.propertyName)) {
      warnings.push(
        `Unit "${u.unitNumber}" references property "${u.propertyName}" not in the Properties tab — will match an existing property if one exists.`,
      );
    }
  }
  for (const b of data.utilityBills) {
    if (b.accountRef && !accountRefs.has(b.accountRef)) {
      warnings.push(
        `Utility bill references account ref "${b.accountRef}" not in the Utility Accounts tab.`,
      );
    }
  }

  const counts: TemplateCounts = {
    portfolios: data.portfolios.length,
    properties: data.properties.length,
    units: data.units.length,
    tenants: data.tenants.length,
    tenancies: data.tenancies.length,
    rentPayments: data.rentPayments.length,
    expenses: data.expenses.length,
    utilityAccounts: data.utilityAccounts.length,
    utilityBills: data.utilityBills.length,
  };

  return { data, counts, warnings, errors };
}
