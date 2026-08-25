import type { ElementType, ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "info"
  | "muted"
  | "danger";

type BadgeSize = "sm" | "md";

type BadgeProps = {
  text: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  tag?: ElementType;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-soft text-content/70",
  success: "bg-padel-green/20 text-padel-green",
  warning: "bg-energy-orange/20 text-energy-orange",
  info: "bg-info/12 text-info",
  muted: "bg-content/10 text-content/70",
  danger: "bg-danger/12 text-danger",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

export default function Badge({
  text,
  variant = "default",
  size = "md",
  tag: Tag = "span",
  className = "",
}: BadgeProps) {
  return (
    <Tag
      className={`inline-flex rounded-full font-semibold ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim()}
    >
      {text}
    </Tag>
  );
}
