export type StatPillColor = 'blue' | 'orange' | 'red' | 'green';

type StatPillProps = {
  label: string;
  value: number;
  color: StatPillColor;
};

const statPillPalette: Record<StatPillColor, { textColor: string; backgroundColor: string }> = {
  blue: {
    textColor: 'var(--blueberry-700)',
    backgroundColor: 'var(--blueberry-700-15)',
  },
  orange: {
    textColor: 'var(--orange-blueberry)',
    backgroundColor: 'var(--orange-blueberry-15)',
  },
  red: {
    textColor: 'var(--red-blueberry)',
    backgroundColor: 'var(--red-blueberry-15)',
  },
  green: {
    textColor: 'var(--green-blueberry)',
    backgroundColor: 'var(--green-blueberry-15)',
  },
};

/** Compact metric chip: the number carries the weight, the label stays quiet. */
export default function StatPill({ label, value, color }: StatPillProps) {
  const { textColor, backgroundColor } = statPillPalette[color];

  return (
    <span
      className="inline-flex max-w-full items-baseline gap-1 rounded-md px-2 py-1 text-[11px]"
      style={{ color: textColor, backgroundColor }}
    >
      <span className="text-xs font-bold leading-none">{value}</span>
      <span className="truncate leading-none">{label}</span>
    </span>
  );
}
