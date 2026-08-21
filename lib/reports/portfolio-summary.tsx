import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './pdf-styles';
import { ReportHeader, ReportFooter, money, fmtDate } from './shared';

export interface PortfolioSummaryData {
  portfolio: { name: string; displayId: string | null; type: string };
  dateFrom: Date;
  dateTo: Date;
  properties: Array<{
    name: string;
    displayId: string | null;
    occupiedPct: number;
    collectionPct: number;
    collected: number;
    expected: number;
    expenses: number;
    netIncome: number;
  }>;
  totals: { income: number; expenses: number; net: number };
  trend: Array<{ month: string; income: number; expenses: number }>;
  generatedAt: Date;
  accountId: string;
}

export function PortfolioSummaryPDF({ data }: { data: PortfolioSummaryData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title="Portfolio Financial Summary"
          accountId={data.accountId}
          generatedAt={data.generatedAt}
        />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.summaryCard, { flex: 2 }]}>
            <Text style={styles.summaryLabel}>Portfolio</Text>
            <Text style={[styles.summaryValue, { fontSize: 12 }]}>
              {data.portfolio.name} · {data.portfolio.displayId ?? '—'}
            </Text>
            <Text style={[styles.tableCell, { marginTop: 4 }]}>
              {fmtDate(data.dateFrom)} — {fmtDate(data.dateTo)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.lavender }]}>
              {money(data.totals.income)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: colors.gold }]}>
              {money(data.totals.expenses)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: data.totals.net >= 0 ? colors.green : colors.red },
              ]}
            >
              {money(data.totals.net)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Properties</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Property</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Occupancy</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Collection</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Collected
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Expenses
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Net
            </Text>
          </View>
          {data.properties.map((p, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellWhite, { flex: 2.5 }]}>{p.name}</Text>
              <Text style={[styles.tableCell, { flex: 1.2 }]}>{p.occupiedPct}%</Text>
              <Text style={[styles.tableCell, { flex: 1.2 }]}>{p.collectionPct}%</Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                {money(p.collected)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                {money(p.expenses)}
              </Text>
              <Text
                style={{
                  flex: 1.5,
                  fontSize: 9,
                  textAlign: 'right',
                  color: p.netIncome >= 0 ? colors.green : colors.red,
                }}
              >
                {money(p.netIncome)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>6-Month Trend</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Month</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Income
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Expenses
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Net
            </Text>
          </View>
          {data.trend.map((t, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellWhite, { flex: 2 }]}>{t.month}</Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                {money(t.income)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                {money(t.expenses)}
              </Text>
              <Text
                style={{
                  flex: 1.5,
                  fontSize: 9,
                  textAlign: 'right',
                  color: t.income - t.expenses >= 0 ? colors.green : colors.red,
                }}
              >
                {money(t.income - t.expenses)}
              </Text>
            </View>
          ))}
        </View>

        <ReportFooter accountId={data.accountId} generatedAt={data.generatedAt} />
      </Page>
    </Document>
  );
}
