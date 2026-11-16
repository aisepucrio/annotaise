export type StatPillColor = 'blue' | 'orange' | 'red' | 'green';

type StatPillProps = {
  label: string;
  value: number;
  color: StatPillColor;
  cut?: 'left' | 'right';
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

export default function StatPill({ label, value, color, cut }: StatPillProps) {
  const { textColor, backgroundColor } = statPillPalette[color];

  const cutClass = cut === 'left' ? 'rounded-l-md' : cut === 'right' ? 'rounded-r-md' : 'rounded-md';

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${cutClass} px-3 py-2 text-sm w-full`}
      style={{
        color: textColor,
        backgroundColor: backgroundColor,
      }}
    >
      <span className="text-lg font-bold leading-none">{value}</span>
      <span className="leading-tight">{label}</span>
    </div>
  );
}
