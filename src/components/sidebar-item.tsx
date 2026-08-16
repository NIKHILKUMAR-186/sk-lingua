import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  to: string;
  isActive: boolean;
  badge?: number | null;
  tooltip?: string;
}

export function SidebarItem({ icon: Icon, label, to, isActive, badge, tooltip }: SidebarItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={tooltip ?? label}
        className={cn(
          "group/menu-button relative h-11 rounded-xl px-3 py-2 transition-all duration-200",
          isActive
            ? "bg-blue-50 text-blue-700 shadow-none"
            : "text-muted-foreground hover:bg-gray-50 hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "aria-disabled:opacity-50 aria-disabled:pointer-events-none",
        )}
      >
        <Link to={to as any} className="flex w-full items-center gap-3">
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
          )}

          <Icon
            className={cn(
              "h-[18px] w-[18px] shrink-0",
              isActive ? "text-blue-700" : "text-muted-foreground group-hover/menu-button:text-foreground",
            )}
          />

          <span
            className={cn(
              "flex-1 truncate text-[13px] font-medium",
              isActive ? "text-blue-700" : "text-foreground",
            )}
          >
            {label}
          </span>

          {badge != null && badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
