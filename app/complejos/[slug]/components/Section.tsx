import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  actions,
  children,
}: SectionCardProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-content/10 bg-surface shadow-sm">
      <div className="flex flex-col gap-2 border-b border-content/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h2 className="text-lg font-semibold text-content">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-content/70">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="px-5 py-5 sm:px-7">{children}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-content/20 bg-surface-soft px-5 py-8 text-center text-sm text-content/70">
      {children}
    </div>
  );
}
