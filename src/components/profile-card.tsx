import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { AuthSession } from "@/hooks/use-auth";
import { formatUserReferenceNo } from "@/lib/auth";

interface ProfileCardProps {
  auth: AuthSession | undefined;
  collapsed: boolean;
  settingsPath?: string;
}

export function ProfileCard({ auth, collapsed, settingsPath = "/settings" }: ProfileCardProps) {
  return (
    <Link
      to={settingsPath}
      className={cn(
        "group relative block rounded-2xl transition-all duration-200",
        collapsed ? "mx-auto p-1" : "mx-2 p-2",
      )}
      aria-label="View profile settings"
    >
      <motion.div
        className={cn(
          "flex items-center gap-3 rounded-xl p-2 transition-all duration-200",
          "hover:bg-[#F3F4F6]",
          collapsed && "justify-center",
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Avatar with online indicator */}
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-hero-gradient text-xs font-bold text-white ring-2 ring-white">
            {auth?.profile?.avatar_url ? (
              <img
                src={auth.profile.avatar_url}
                alt={auth?.profile?.full_name ?? "Profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm">
                {auth?.profile?.full_name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            )}
          </div>
          {/* Online dot */}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-1 ring-white" />
          </span>
        </div>

        {/* Info */}
        {!collapsed && (
          <motion.div
            className="min-w-0 flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="truncate text-sm font-semibold leading-tight text-foreground">
              {auth?.profile?.full_name ?? "User"}
            </div>
            <div className="truncate text-xs text-muted-foreground">{auth?.user?.email ?? ""}</div>
            {/* {formatUserReferenceNo(auth?.profile?.reference_no) && (
              // <div className="truncate text-[11px] font-medium tabular-nums text-muted-foreground/70">
              //   {formatUserReferenceNo(auth?.profile?.reference_no)}
              // </div>
            )} */}
          </motion.div>
        )}

        {/* Arrow */}
        {!collapsed && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
        )}
      </motion.div>
    </Link>
  );
}
