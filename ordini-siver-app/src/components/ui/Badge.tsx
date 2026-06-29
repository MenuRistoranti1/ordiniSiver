type BadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "default"

type BadgeProps = {
  children: React.ReactNode
  variant?: BadgeVariant
}

const styles: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-700",
  danger: "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
  default: "bg-slate-100 text-slate-700",
}

export default function Badge({
  children,
  variant = "default",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${styles[variant]}`}
    >
      {children}
    </span>
  )
}