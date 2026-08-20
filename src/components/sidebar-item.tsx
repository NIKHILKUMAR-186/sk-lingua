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
            ? "mentor-sidebar-item-active"
            : "text-muted-foreground hover:bg-primary-soft hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "aria-disabled:opacity-50 aria-disabled:pointer-events-none",
        )}
      >
        <Link to={to as any} className="flex w-full items-center gap-3">
          <Icon
            className={cn(
              "h-[18px] w-[18px] shrink-0",
              isActive ? "text-electric-iris" : "text-muted-foreground group-hover/menu-button:text-foreground",
            )}
          />

          <span
            className={cn(
              "flex-1 truncate text-[13px] font-medium",
              isActive ? "text-electric-iris" : "text-foreground",
            )}
          >
            {label}
          </span>

          {badge != null && badge > 0 && (
            <span className="mentor-sidebar-item-badge">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
