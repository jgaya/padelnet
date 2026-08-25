import type { ElementType, ReactNode } from "react";

type MarkProps = {
  title: ReactNode;
  tag?: ElementType;
  className?: string;
};

export default function Mark({
  title,
  tag: Tag = "h1",
  className = "",
}: MarkProps) {
  return (
    <Tag
      className={`font-logo m-0 text-3xl font-semibold leading-tight tracking-tight text-content ${className}`}
    >
      {title}
    </Tag>
  );
}
