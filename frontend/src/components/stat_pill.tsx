type StatPillProps = {
  /** Texto descritivo da métrica */
  label: string;
  /** Valor numérico a ser exibido */
  value: number;
  /** Cor do texto (variável CSS do globals.css) */
  textColor: string;
  /** Cor de fundo (variável CSS do globals.css) */
  backgroundColor: string;
};

export default function StatPill({
  label,
  value,
  textColor,
  backgroundColor,
}: StatPillProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-lg px-3 py-2 text-sm w-full"
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
