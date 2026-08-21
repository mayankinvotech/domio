import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './pdf-styles';
import { ReportHeader, ReportFooter, money, fmtDate } from './shared';

export interface OccupancyReportData {
  scopeLabel: string;
  units: Array<{
    unitNumber: string;
    property: string;
    displayId: string | null;
    status: string;
    tenantName: string | null;
    leaseStart: Date | null;
    leaseEnd: Date | null;
    daysRemaining: number | null;
    monthlyRent: number;
  }>;
  summary: { total: number; occupied: number; vacant: number };
  generatedAt: Date;
  accountId: string;
}

export function OccupancyReportPDF({ data }: { data: OccupancyReportData }) {
  const occPct =
    data.summary.total > 0
      ? Math.round((data.summary.occupied / data.summary.total) * 100)
      : 0;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title="Occupancy Report"
          accountId={data.accountId}
          generatedAt={data.generatedAt}
        />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.summaryCard, { flex: 2 }]}>
            <Text style={styles.summaryLabel}>Scope</Text>
            <Text style={[styles.summaryValue, { fontSize: 12 }]}>
              {data.scopeLabel}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Total Units</Text>
            <Text style={styles.summaryValue}>{data.summary.total}</Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Occupied</Text>
            <Text style={[styles.summaryValue, { color: colors.lavender }]}>
              {data.summary.occupied} ({occPct}%)
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Vacant</Text>
            <Text style={[styles.summaryValue, { color: colors.gold }]}>
              {data.summary.vacant}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Units</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Unit</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Property</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Tenant</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Lease Start</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Lease End</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Days</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>
              Rent
            </Text>
          </View>
          {data.units.map((u, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellWhite, { flex: 1 }]}>
                {u.unitNumber}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{u.property}</Text>
              <Text
                style={[
                  styles.tableCell,
                  {
                    flex: 1.2,
                    color:
                      u.status === 'OCCUPIED'
                        ? colors.lavender
                        : u.status === 'MAINTENANCE'
                          ? colors.gold
                          : colors.body,
                  },
                ]}
              >
                {u.status}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {u.tenantName ?? '—'}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>
                {fmtDate(u.leaseStart)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>
                {fmtDate(u.leaseEnd)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {u.daysRemaining != null ? `${u.daysRemaining}` : '—'}
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
