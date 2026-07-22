type Props = {
  label: string;
  value: string;
  tone?: string;
  border?: string;
  footnote?: string;
};

export default function SummaryCard({ label, value, tone = "text-ink", border, footnote }: Props) {
  return (
    <div className={`card p-4u ${border ?? ""}`}>
      <p className="text-sm text-ink-faint">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${tone}`}>{value}</p>
      {footnote && <p className="text-xs text-ink-faint mt-2">{footnote}</p>}
    </div>
  );
}
