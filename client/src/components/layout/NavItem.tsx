import { Link } from "wouter";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  title: string;
  icon: ElementType;
  href?: string;
  active?: boolean;
  disabled?: boolean;
}

export function NavItem({ title, icon: Icon, href, active = false, disabled = false }: NavItemProps) {
  const baseClasses = cn(
    "relative h-10 w-10 flex items-center justify-center rounded-md",
    "text-neutral-500 hover:text-[var(--brand-teal)]",
    disabled && "opacity-60 cursor-not-allowed hover:text-neutral-500"
  );

  const wrapperClasses = cn(
    "w-full flex items-center justify-center my-1",
    active && "text-[var(--brand-teal)] border-l-2 border-[var(--brand-teal)]"
  );

  const content = (
    <div className={baseClasses} aria-current={active ? "page" : undefined} title={title}>
      <Icon className="h-5 w-5" />
    </div>
  );

  if (!href || disabled) {
    return <div className={wrapperClasses}>{content}</div>;
  }

  return (
    <div className={wrapperClasses}>
      <Link href={href}>{content}</Link>
    </div>
  );
}
