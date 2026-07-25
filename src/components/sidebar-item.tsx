import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
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
          "group/menu-button relative h-12 rounded-[14px] px-4 py-3 transition-all duration-200",
          "data-[active=true]:bg-hero-gradient data-[active=true]:text-white data-[active=true]:shadow-sm",
          "hover:translate-x-[4px] hover:bg-[#F3F4F6] data-[active=true]:hover:translate-x-[4px]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "aria-disabled:opacity-50 aria-disabled:pointer-events-none",
        )}
      >
        <Link to={to as any} className="flex w-full items-center gap-3">
          {/* Active indicator bar */}
          {isActive && (
            <motion.span
              layoutId="sidebar-active-indicator"
              className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-white"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}

          <Icon
            className={cn(
              "h-5 w-5 shrink-0 stroke-[1.8]",
              isActive ? "text-white" : "text-muted-foreground group-hover/menu-button:text-foreground",
            )}
          />

          <span
            className={cn(
              "flex-1 truncate text-sm font-medium",
              isActive ? "text-white" : "text-foreground",
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