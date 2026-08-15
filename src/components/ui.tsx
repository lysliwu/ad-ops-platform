import { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  valueClassName,
  hint,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={clsx("mt-1 text-2xl font-semibold", valueClassName)}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </Card>
  );
}

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: "gray" | "green" | "red" | "yellow" | "blue";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:text-gray-400",
    ghost: "text-blue-600 hover:bg-blue-50 disabled:text-gray-400",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-400">
      {children}
    </div>
  );
}

export function scoreTone(label: string | null | undefined): "green" | "red" | "gray" {
  if (label === "Above average") return "green";
  if (label === "Below average") return "red";
  return "gray";
}

export function qsTone(qs: number | null | undefined): "green" | "yellow" | "red" | "gray" {
  if (qs == null) return "gray";
  if (qs >= 7) return "green";
  if (qs >= 5) return "yellow";
  return "red";
}
