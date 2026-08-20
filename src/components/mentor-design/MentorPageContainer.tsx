import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MentorPageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

export function MentorPageContainer({
  children,
  className,
  maxWidth = "5xl",
}: MentorPageContainerProps) {
  return (
    <div className={cn("mx-auto w-full space-y-8 px-4 py-6 sm:px-6 lg:px-8", maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
}
