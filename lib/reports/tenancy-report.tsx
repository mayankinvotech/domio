import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './pdf-styles';
import { ReportHeader, ReportFooter, money, fmtDate } from './shared';

export interface TenancyReportData {
  tenant: {
    name: string;
    email: string;
    phone: string;
    displayId: string | null;
    nationalId: string | null;
  };
  unit: { name: string; unitNumber: string; displayId: string | null };
  property: { name: string; address: string; displayId: string | null };
  tenancy: {
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    securityDeposit: number;
    status: string;
    displayId: string | null;
  };
  ledger: Array<{
    month: string;
    amountDue: number;
    amountPaid: number;
    balance: number;
    status: string;
    paidDate?: Date | null;
  }>;
  generatedAt: Date;
  accountId: string;
}

export function TenancyReportPDF({ data }: { data: TenancyReportData }) {
  const totalDue = data.ledger.reduce((s, r) => s + r.amountDue, 0);
  const totalPaid = data.ledger.reduce((s, r) => s + r.amountPaid, 0);
  const balance = totalDue - totalPaid;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title="Tenancy Report"
          accountId={data.accountId}
          generatedAt={data.generatedAt}
        />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Tenant</Text>
            <Text style={styles.tableCellWhite}>{data.tenant.name}</Text>
            <Text style={styles.tableCell}>{data.tenant.email}</Text>
            <Text style={styles.tableCell}>{data.tenant.phone}</Text>
            <Text style={[styles.tableCell, { marginTop: 4 }]}>
              ID: {data.tenant.displayId ?? '—'}
            </Text>
            <Text style={styles.tableCell}>
              National ID: {data.tenant.nationalId ?? '—'}
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
            <Text style={styles.sectionTitle}>Lease</Text>
            <Text style={styles.tableCell}>Ref: {data.tenancy.displayId ?? '—'}</Text>
            <Text style={styles.tableCell}>
              Start: {fmtDate(data.tenancy.startDate)}
            </Text>
            <Text style={styles.tableCell}>
              End: {fmtDate(data.tenancy.endDate)}
            </Text>
            <Text style={styles.tableCellWhite}>
              Rent: {money(data.tenancy.monthlyRent)}/mo
            </Text>
            <Text style={styles.tableCell}>
              Deposit: {money(data.tenancy.securityDeposit)}
            </Text>
            <Text style={styles.tableCell}>Status: {data.tenancy.status}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Total Due</Text>
            <Text style={[styles.summaryValue, { color: colors.gold }]}>
              {money(totalDue)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={[styles.summaryValue, { color: colors.lavender }]}>
              {money(totalPaid)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: balance > 0 ? colors.red : colors.green },
              ]}
            >
              {money(balance)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Full Payment History</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Month</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Due
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Paid
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Balance
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Paid Date</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
          </View>
          {data.ledger.map((r, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellWhite, { flex: 2 }]}>{r.month}</Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                {money(r.amountDue)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                {r.amountPaid > 0 ? money(r.amountPaid) : '—'}
              </Text>
              <Text
                style={{
                  flex: 1.5,
                  fontSize: 9,
                  textAlign: 'right',
                  color: r.balance > 0 ? colors.red : colors.green,
                }}
              >
                {money(r.balance)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>
                {fmtDate(r.paidDate)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  {
                    flex: 1,
                    color:
                      r.status === 'PAID'
                        ? colors.lavender
                        : r.status === 'OVERDUE'
                          ? colors.red
                          : colors.gold,
                  },
                ]}
              >
                {r.status}
              </Text>
            </View>
          ))}
        </View>

        <ReportFooter accountId={data.accountId} generatedAt={data.generatedAt} />
      </Page>
    </Document>
  );
}
