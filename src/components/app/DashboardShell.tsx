import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard, Radio, Bookmark, Briefcase, Settings,
  BarChart3, Mail, LogOut, ChevronDown, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile";
import { track } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FacebookIcon, InstagramIcon, YouTubeIcon, PinterestIcon } from "@/components/icons/SocialIcons";

const SOCIALS = [
  { href: "#", label: "Facebook", Icon: FacebookIcon },
  { href: "https://www.instagram.com/price_you_?igsh=MXFhaTZndzh0MnN0cQ==", label: "Instagram", Icon: InstagramIcon },
  { href: "#", label: "YouTube", Icon: YouTubeIcon },
  { href: "https://pin.it/5yFHKnjLL", label: "Pinterest", Icon: PinterestIcon },
];

type NavItem = {
  to: "/app" | "/app/signals" | "/app/watchlist" | "/app/portfolio" | "/app/settings";
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/signals", label: "Price alerts", icon: Radio },
  { to: "/app/watchlist", label: "Brand watchlist", icon: Bookmark },
  { to: "/app/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const LOCKED = [
  { label: "Analytics / AI", icon: BarChart3 },
  { label: "Digests", icon: Mail },
] as const;

const TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/signals": "Price alerts",
  "/app/watchlist": "Brand watchlist",
  "/app/portfolio": "Portfolio",
  "/app/settings": "Settings",
};

export function DashboardShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = TITLES[pathname] ?? "Dashboard";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-hairline bg-background/90 backdrop-blur">
        <button aria-label="Open menu" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-sm">{title}</span>
        <ProfileMenu compact />
      </div>

      <div className="lg:flex">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="flex-1 min-w-0 lg:pl-64">
          <Topbar title={title} />
          <main className="px-5 sm:px-8 py-8 max-w-6xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-foreground/30 lg:hidden" onClick={onClose} />
      ) : null}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-hairline bg-surface/80 backdrop-blur transition-transform lg:translate-x-0 flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-hairline">
          <Link
            to="/app"
            className="inline-block leading-none"
            aria-label="PriceYou home"
            onClick={onClose}
          >
            <Logo className="text-[1.35rem]" />
          </Link>
          <button aria-label="Close menu" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-display font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-surface-2"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Coming soon
          </div>
          <TooltipProvider delayDuration={150}>
            {LOCKED.map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <div
                      aria-disabled
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-display font-medium text-muted-foreground/70 cursor-not-allowed"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest rounded-full border border-hairline px-1.5 py-0.5">
                        In dev
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">Coming soon</TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>
        <ul className="flex items-center gap-4 px-5 py-4 border-t border-hairline">
          {SOCIALS.map(({ href, label, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex text-muted-foreground transition-all duration-200 hover:text-primary hover:scale-110"
              >
                <Icon className="h-[20px] w-[20px]" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}

function Topbar({ title }: { title: string }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMyProfile,
  });
  const isFree = profile?.plan !== "pro";
  return (
    <header className="hidden lg:flex items-center justify-between h-16 px-8 border-b border-hairline bg-background/80 backdrop-blur sticky top-0 z-30">
      <h1 className="font-display text-lg font-medium">{title}</h1>
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-display font-semibold uppercase tracking-wider">
              {isFree ? "Free" : "Pro"}
            </span>
            {isFree ? (
              <Link
                to="/app/settings"
                className="btn-primary text-xs"
                onClick={() => track("upgrade_click", { from: "topbar" })}
              >
                Upgrade
              </Link>
            ) : null}
          </>
        )}
        <ProfileMenu />
      </div>
    </header>
  );
}

function ProfileMenu({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMyProfile,
  });

  const initials = (profile?.display_name || profile?.email || "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  async function handleLogout() {
    track("log_out", {});
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border border-hairline bg-background hover:bg-surface transition-colors px-1.5 py-1">
          <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-display font-semibold inline-flex items-center justify-center">
            {initials || "•"}
          </span>
          {compact ? null : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mr-1" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-sm font-medium truncate">
            {profile?.display_name || "Signed in"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {profile?.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
