import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card shadow-card", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-6 py-4">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type PillProps = {
  children: ReactNode;
  variant?: "primary" | "sand" | "ghost";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
};

export function Pill({ children, variant = "primary", className, onClick, type = "button" }: PillProps) {
  const styles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    sand: "bg-sand text-sand-foreground hover:bg-sand/80",
    ghost: "border border-border bg-card text-foreground hover:bg-secondary",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "danger" | "warning" | "success" | "muted";
}) {
  const styles = {
    danger: "bg-danger text-danger-foreground",
    warning: "bg-warning text-warning-foreground",
    success: "bg-success text-success-foreground",
    muted: "bg-secondary text-muted-foreground",
  }[tone];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide", styles)}>
      {children}
    </span>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn("px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-foreground/80", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-6 py-3.5 text-sm text-foreground", className)}>{children}</td>;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function Stepper({
  value,
  onChange,
  label = "Cantidad",
}: {
  value: number;
  onChange: (next: number) => void;
  label?: string;
}) {
  const [texto, setTexto] = useState(String(value));
  useEffect(() => {
    if (Number(texto) !== value) setTexto(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:bg-sand hover:text-sand-foreground disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(round2(Math.max(0, value - 1)))} disabled={value <= 0} aria-label="Restar">
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-label={label}
        value={texto}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          setTexto(raw);
          const n = Number(raw);
          if (raw !== "" && !Number.isNaN(n)) onChange(round2(Math.max(0, n)));
          else if (raw === "") onChange(0);
        }}
        onBlur={() => setTexto(String(value))}
        className="no-spinner h-9 w-16 rounded-lg border border-transparent bg-transparent text-center text-base font-semibold tabular-nums text-foreground outline-none transition-colors hover:border-border focus:border-sand focus:bg-card"
      />
      <button type="button" className={btn} onClick={() => onChange(round2(value + 1))} aria-label="Sumar">
        +
      </button>
    </div>
  );
}
