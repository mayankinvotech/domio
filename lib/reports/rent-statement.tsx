import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './pdf-styles';

export interface RentStatementData {
  tenant: { name: string; email: string; phone: string; displayId: string | null };
  unit: { name: string; unitNumber: string; displayId: string | null };
  property: { name: string; address: string; displayId: string | null };
  tenancy: {
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    securityDeposit: number;
    displayId: string | null;
  };
  entries: Array<{
    date: Date;
    rentFor?: Date | null;
    type: string;
    description: string;
    amount: number; // signed: negative = charge, positive = payment
  }>;
  generatedAt: Date;
  accountId: string;
  periodFrom: Date;
  periodTo: Date;
}

const money = (n: number) => `Rs ${Math.abs(n).toLocaleString('en-IN')}`;
const dmy = (d: Date) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
const TYPE_LABEL: Record<string, string> = {
  RENT_CHARGE: 'Charge',
  PAYMENT: 'Payment',
  ADJUSTMENT: 'Adjustment',
};

export function RentStatementPDF({ data }: { data: RentStatementData }) {
  const totalCharged = data.entries
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + Math.abs(e.amount), 0);
  const totalPaid = data.entries
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const balance = data.entries.reduce((s, e) => s + e.amount, 0);

  // Running balance, oldest first.
  let running = 0;
  const rows = data.entries.map((e) => {
    running += e.amount;
    return { ...e, running };
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>DOMIO</Text>
            <Text style={styles.reportSubtitle}>Property Management</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.reportTitle}>Rent Statement</Text>
            <Text style={styles.reportSubtitle}>
              Generated: {data.generatedAt.toLocaleDateString()}
            </Text>
            <Text style={styles.reportSubtitle}>Account: {data.accountId}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 20, gap: 8 }}>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>Period</Text>
            <Text style={[styles.summaryValue, { fontSize: 12 }]}>
              {data.periodFrom.toLocaleDateString()} —{' '}
              {data.periodTo.toLocaleDateString()}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>Tenancy Reference</Text>
            <Text style={[styles.summaryValue, { fontSize: 12 }]}>
              {data.tenancy.displayId ?? '—'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Tenant</Text>
            <Text style={styles.tableCellWhite}>{data.tenant.name}</Text>
            <Text style={styles.tableCell}>{data.tenant.email}</Text>
            <Text style={styles.tableCell}>{data.tenant.phone}</Text>
            <Text style={[styles.tableCell, { marginTop: 4 }]}>
              ID: {data.tenant.displayId ?? '—'}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Property / Unit</Text>
            <Text style={styles.tableCellWhite}>{data.property.name}</Text>
            <Text style={styles.tableCell}>{data.property.address}</Text>
            <Text style={styles.tableCellWhite}>
              {data.unit.name} — Unit {data.unit.unitNumber}
            </Text>
            <Text style={[styles.tableCell, { marginTop: 4 }]}>
              Unit ID: {data.unit.displayId ?? '—'}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Lease Details</Text>
            <Text style={styles.tableCell}>
              Start: {data.tenancy.startDate.toLocaleDateString()}
            </Text>
            <Text style={styles.tableCell}>
              End: {data.tenancy.endDate.toLocaleDateString()}
            </Text>
            <Text style={styles.tableCellWhite}>
              Rent: {money(data.tenancy.monthlyRent)}/mo
            </Text>
            <Text style={styles.tableCell}>
              Deposit: {money(data.tenancy.securityDeposit)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Total Charged</Text>
            <Text style={[styles.summaryValue, { color: colors.gold }]}>
              {money(totalCharged)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={[styles.summaryValue, { color: colors.green }]}>
              {money(totalPaid)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: balance < 0 ? colors.red : colors.green },
              ]}
            >
              {balance < 0 ? `${money(balance)} due` : money(balance)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payment History</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>Date</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>Rent For</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Type</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2.6 }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Amount
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Balance
            </Text>
          </View>
          {rows.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                No rent activity in this period.
              </Text>
            </View>
          ) : (
            rows.map((row, i) => {
              const isCredit = row.amount > 0;
              return (
                <View
                  key={i}
                  style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={[styles.tableCellWhite, { flex: 1.4 }]}>
                    {dmy(row.date)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.4 }]}>
                    {row.rentFor ? dmy(row.rentFor) : '—'}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>
                    {TYPE_LABEL[row.type] ?? row.type}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2.6 }]}>
                    {row.description}
                  </Text>
                  <Text
                    style={{
                      flex: 1.5,
                      fontSize: 9,
                      textAlign: 'right',
                      color: isCredit ? colors.green : colors.red,
                    }}
                  >
                    {isCredit ? '+' : '-'}
                    {money(row.amount)}
                  </Text>
                  <Text
                    style={{
                      flex: 1.5,
                      fontSize: 9,
                      textAlign: 'right',
                      color: row.running < 0 ? colors.red : colors.white,
                    }}
                  >
                    {row.running < 0 ? '-' : ''}
                    {money(row.running)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Domio Property Management · {data.accountId}
          </Text>
          <Text style={styles.footerText}>
            Generated {data.generatedAt.toLocaleDateString()}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
