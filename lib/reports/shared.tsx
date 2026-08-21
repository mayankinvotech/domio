import { Text, View } from '@react-pdf/renderer';
import { styles } from './pdf-styles';

// PDF uses Helvetica, which has no ₹ (U+20B9) glyph — use "Rs " so it renders.
export const money = (n: number): string =>
  `Rs ${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const fmtDate = (d?: Date | string | null): string =>
  d
    ? new Date(d).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export function ReportHeader({
  title,
  accountId,
  generatedAt,
}: {
  title: string;
  accountId: string;
  generatedAt: Date;
}) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.logo}>DOMIO</Text>
        <Text style={styles.reportSubtitle}>Property Management</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.reportTitle}>{title}</Text>
        <Text style={styles.reportSubtitle}>
          Generated: {generatedAt.toLocaleDateString()}
        </Text>
        <Text style={styles.reportSubtitle}>Account: {accountId}</Text>
      </View>
    </View>
  );
}

export function ReportFooter({
  accountId,
  generatedAt,
}: {
  accountId: string;
  generatedAt: Date;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Domio Property Management · {accountId}
      </Text>
      <Text style={styles.footerText}>
        Generated {generatedAt.toLocaleDateString()}
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}
