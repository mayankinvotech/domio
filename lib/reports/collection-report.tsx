import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './pdf-styles';
import { ReportHeader, ReportFooter } from './shared';

export interface CollectionReportData {
  fyLabel: string;
  scopeLabel: string; // e.g. "All units" or "Property: Test 1"
  months: { key: string; label: string }[]; // Apr..Mar
  rows: Array<{
    unit: string; // "Unit Shop-4"
    tenant: string; // occupant or "—"
    opening: number; // owed b/f (positive magnitude)
    byMonth: Record<string, number>; // monthKey → received
    received: number; // FY received
    due: number; // current outstanding (positive magnitude)
  }>;
  totals: {
    opening: number;
    byMonth: Record<string, number>;
    received: number;
    due: number;
  };
  generatedAt: Date;
  accountId: string;
}

// Plain integer with Indian grouping, no currency glyph (Helvetica has no ₹).
const num = (n: number) => (n ? n.toLocaleString('en-IN') : '–');
const neg = (n: number) => (n > 0 ? `-${n.toLocaleString('en-IN')}` : '–');

// Just the month abbreviation ("Apr") — the year is in the FY title.
const shortMonth = (label: string) => label.split(' ')[0];

const cell = { fontSize: 7, color: colors.body, textAlign: 'right' as const };
const monthFlex = 1;
const unitFlex = 2.4;
const sumFlex = 1.4;

export function CollectionReportPDF({ data }: { data: CollectionReportData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <ReportHeader
          title="Collection Tracker"
          accountId={data.accountId}
          generatedAt={data.generatedAt}
        />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>Financial Year</Text>
            <Text style={[styles.summaryValue, { fontSize: 13 }]}>
              {data.fyLabel}
            </Text>
            <Text style={[styles.tableCell, { marginTop: 2 }]}>
              {data.scopeLabel}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Opening (b/f)</Text>
            <Text style={[styles.summaryValue, { color: colors.gold }]}>
              {neg(data.totals.opening)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Received</Text>
            <Text style={[styles.summaryValue, { color: colors.green }]}>
              {num(data.totals.received)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Due (current)</Text>
            <Text style={[styles.summaryValue, { color: colors.red }]}>
              {neg(data.totals.due)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Collection by unit and month</Text>
        <Text style={[styles.tableCell, { fontSize: 7, marginBottom: 4 }]}>
          All amounts in Rs. Owed (opening / due) shown as negative.
        </Text>

        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: unitFlex }]}>
              Unit / Tenant
            </Text>
            <Text
              style={[styles.tableHeaderCell, { flex: sumFlex, textAlign: 'right' }]}
            >
              Opening
            </Text>
            {data.months.map((mo) => (
              <Text
                key={mo.key}
                style={[styles.tableHeaderCell, { flex: monthFlex, textAlign: 'right' }]}
              >
                {shortMonth(mo.label)}
              </Text>
            ))}
            <Text
              style={[styles.tableHeaderCell, { flex: sumFlex, textAlign: 'right' }]}
            >
              Received
            </Text>
            <Text
              style={[styles.tableHeaderCell, { flex: sumFlex, textAlign: 'right' }]}
            >
              Due
            </Text>
          </View>

          {/* Rows — one per unit */}
          {data.rows.map((r, i) => (
            <View
              key={r.unit + i}
              style={i % 2 ? styles.tableRowAlt : styles.tableRow}
              wrap={false}
            >
              <View style={{ flex: unitFlex }}>
                <Text style={styles.tableCellWhite}>{r.unit}</Text>
                <Text style={[styles.tableCell, { fontSize: 7 }]}>{r.tenant}</Text>
              </View>
              <Text style={[cell, { flex: sumFlex, color: colors.gold }]}>
                {neg(r.opening)}
              </Text>
              {data.months.map((mo) => (
                <Text key={mo.key} style={[cell, { flex: monthFlex }]}>
                  {num(r.byMonth[mo.key] ?? 0)}
                </Text>
              ))}
              <Text style={[cell, { flex: sumFlex, color: colors.green }]}>
                {num(r.received)}
              </Text>
              <Text style={[cell, { flex: sumFlex, color: colors.red }]}>
                {neg(r.due)}
              </Text>
            </View>
          ))}

          {/* Totals */}
          <View
            style={[styles.tableRow, { borderTop: `1 solid ${colors.border}` }]}
            wrap={false}
          >
            <Text style={[styles.tableCellWhite, { flex: unitFlex, fontWeight: 'bold' }]}>
              Total
            </Text>
            <Text style={[cell, { flex: sumFlex, color: colors.gold, fontWeight: 'bold' }]}>
              {neg(data.totals.opening)}
            </Text>
            {data.months.map((mo) => (
              <Text
                key={mo.key}
                style={[cell, { flex: monthFlex, color: colors.white }]}
              >
                {num(data.totals.byMonth[mo.key] ?? 0)}
              </Text>
            ))}
            <Text style={[cell, { flex: sumFlex, color: colors.green, fontWeight: 'bold' }]}>
              {num(data.totals.received)}
            </Text>
            <Text style={[cell, { flex: sumFlex, color: colors.red, fontWeight: 'bold' }]}>
              {neg(data.totals.due)}
            </Text>
          </View>
        </View>

        <ReportFooter
          accountId={data.accountId}
          generatedAt={data.generatedAt}
        />
      </Page>
    </Document>
  );
}
