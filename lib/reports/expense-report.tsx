import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './pdf-styles';
import { ReportHeader, ReportFooter, money, fmtDate } from './shared';

export interface ExpenseReportData {
  scopeLabel: string;
  dateFrom: Date;
  dateTo: Date;
  category: string | null;
  rows: Array<{
    date: Date;
    category: string;
    description: string | null;
    context: string;
    amount: number;
  }>;
  byCategory: Array<{ category: string; total: number }>;
  total: number;
  generatedAt: Date;
  accountId: string;
}

export function ExpenseReportPDF({ data }: { data: ExpenseReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title="Expense Report"
          accountId={data.accountId}
          generatedAt={data.generatedAt}
        />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={[styles.summaryCard, { flex: 2 }]}>
            <Text style={styles.summaryLabel}>Scope</Text>
            <Text style={[styles.summaryValue, { fontSize: 12 }]}>
              {data.scopeLabel}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 2 }]}>
            <Text style={styles.summaryLabel}>Period</Text>
            <Text style={[styles.summaryValue, { fontSize: 12 }]}>
              {fmtDate(data.dateFrom)} — {fmtDate(data.dateTo)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={[styles.summaryValue, { color: colors.gold }]}>
              {money(data.total)}
            </Text>
          </View>
        </View>

        {data.byCategory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>By Category</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Category</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>
                  Total
                </Text>
              </View>
              {data.byCategory.map((c, i) => (
                <View
                  key={i}
                  style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={[styles.tableCellWhite, { flex: 3 }]}>
                    {c.category}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                    {money(c.total)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Expenses</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Date</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Category</Text>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Property / Unit</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>
              Amount
            </Text>
          </View>
          {data.rows.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                No expenses in this period.
              </Text>
            </View>
          ) : (
            data.rows.map((r, i) => (
              <View
                key={i}
                style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, { flex: 1.5 }]}>
                  {fmtDate(r.date)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{r.category}</Text>
                <Text style={[styles.tableCellWhite, { flex: 3 }]}>
                  {r.description ?? '—'}
                </Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{r.context}</Text>
                <Text
                  style={[styles.tableCellWhite, { flex: 1.2, textAlign: 'right' }]}
                >
                  {money(r.amount)}
                </Text>
              </View>
            ))
          )}
          <View style={[styles.tableHeader, { marginTop: 4 }]}>
            <Text style={[styles.tableHeaderCell, { flex: 8 }]}>Total</Text>
            <Text
              style={[
                styles.tableHeaderCell,
                { flex: 1.2, textAlign: 'right', color: colors.gold },
              ]}
            >
              {money(data.total)}
            </Text>
          </View>
        </View>

        <ReportFooter accountId={data.accountId} generatedAt={data.generatedAt} />
      </Page>
    </Document>
  );
}
