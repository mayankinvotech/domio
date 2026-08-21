import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './pdf-styles';
import { ReportHeader, ReportFooter, money, fmtDate } from './shared';

export interface PropertyReportData {
  property: {
    name: string;
    address: string;
    city: string;
    country: string;
    displayId: string | null;
    type: string;
    status: string;
  };
  units: Array<{
    unitNumber: string;
    name: string;
    displayId: string | null;
    status: string;
    tenantName: string | null;
    monthlyRent: number;
    leaseEnd: Date | null;
  }>;
  finance: {
    rentExpected: number;
    rentCollected: number;
    expenses: number;
    netIncome: number;
  };
  occupancy: { occupied: number; total: number };
  generatedAt: Date;
  accountId: string;
}

export function PropertyReportPDF({ data }: { data: PropertyReportData }) {
  const occPct =
    data.occupancy.total > 0
      ? Math.round((data.occupancy.occupied / data.occupancy.total) * 100)
      : 0;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title="Property Report"
          accountId={data.accountId}
          generatedAt={data.generatedAt}
        />

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>{data.property.name}</Text>
          <Text style={styles.tableCell}>
            {data.property.address}, {data.property.city}, {data.property.country}
          </Text>
          <Text style={[styles.tableCell, { marginTop: 4 }]}>
            {data.property.type} · {data.property.status} ·{' '}
            {data.property.displayId ?? '—'}
          </Text>
        </View>

        {/* Financial summary */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Occupancy</Text>
            <Text style={[styles.summaryValue, { color: colors.violet }]}>
              {data.occupancy.occupied}/{data.occupancy.total} ({occPct}%)
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Rent Collected</Text>
            <Text style={[styles.summaryValue, { color: colors.lavender }]}>
              {money(data.finance.rentCollected)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: colors.gold }]}>
              {money(data.finance.expenses)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Net Income</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    data.finance.netIncome >= 0 ? colors.green : colors.red,
                },
              ]}
            >
              {money(data.finance.netIncome)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Units</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Unit</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Tenant</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Lease End</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>
              Rent
            </Text>
          </View>
          {data.units.map((u, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellWhite, { flex: 1 }]}>
                {u.unitNumber}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{u.name}</Text>
              <Text style={[styles.tableCell, { flex: 1.2 }]}>{u.status}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {u.tenantName ?? '—'}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>
                {fmtDate(u.leaseEnd)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right' }]}>
                {money(u.monthlyRent)}
              </Text>
            </View>
          ))}
        </View>

        <ReportFooter accountId={data.accountId} generatedAt={data.generatedAt} />
      </Page>
    </Document>
  );
}
