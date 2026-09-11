import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, ShoppingBag, User as UserIcon } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/rooms", label: "Rooms" },
  { to: "/restaurant", label: "Restaurant" },
  { to: "/services", label: "Services" },
  { to: "/offers", label: "Offers" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

function initials(name?: string | null, email?: string | null) {
  const src = name?.trim() || email || "G";
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export function Header({ transparent = false }: { transparent?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const { totals, hydrated } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !transparent || scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        solid ? "glass border-b border-border/70 shadow-soft" : "bg-transparent",
      )}
    >
      <div className="container-x flex h-[4.5rem] items-center justify-between gap-4">
        <Logo light={!solid} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className={cn(
                "relative rounded-full px-3.5 py-2 text-[0.8rem] font-medium tracking-[0.08em] uppercase transition-colors",
                solid
                  ? "text-foreground/75 hover:text-foreground"
                  : "text-espresso-foreground/80 hover:text-espresso-foreground",
              )}
              activeProps={{
                className: cn(
                  "after:absolute after:bottom-0.5 after:left-1/2 after:h-0.5 after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-gold",
                  solid ? "text-foreground" : "text-espresso-foreground",
                ),
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={cn("relative", !solid && "text-espresso-foreground hover:bg-espresso-foreground/10 hover:text-espresso-foreground")}
          >
            <Link to="/cart" aria-label="Cart">
              <ShoppingBag className="size-5" />
              {hydrated && totals.itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-gradient-gold text-[0.65rem] font-semibold text-primary-foreground shadow-gold">
                  {totals.itemCount > 9 ? "9+" : totals.itemCount}
                </span>
              )}
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full p-0.5 transition hover:ring-2 hover:ring-gold/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                  aria-label="Account menu"
                >
                  <Avatar className="size-9 border border-gold/40">
                    <AvatarFallback className="bg-champagne font-medium text-accent-foreground">
                      {initials(profile?.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-medium">{profile?.full_name || "Guest"}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/account" })}>
                  <UserIcon className="size-4" /> My Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/account/bookings" })}>
                  <ShoppingBag className="size-4" /> My Bookings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <LayoutDashboard className="size-4" /> Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()} className="text-destructive focus:text-destructive">
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className={cn("hidden sm:inline-flex", !solid && "text-espresso-foreground hover:bg-espresso-foreground/10 hover:text-espresso-foreground")}
              >
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/rooms">Book Now</Link>
              </Button>
            </>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("lg:hidden", !solid && "text-espresso-foreground hover:bg-espresso-foreground/10 hover:text-espresso-foreground")}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="border-b p-5">
                <Logo />
              </div>
              <nav className="flex flex-col p-3" aria-label="Mobile">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    activeOptions={{ exact: l.to === "/" }}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium tracking-wide uppercase text-foreground/80 hover:bg-accent"
                    activeProps={{ className: "bg-accent text-foreground" }}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t p-5">
                {user ? (
                  <>
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link to="/account">My Account</Link>
                    </Button>
                    {isAdmin && (
                      <Button variant="espresso" asChild onClick={() => setOpen(false)}>
                        <Link to="/admin">Admin Dashboard</Link>
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => { setOpen(false); void signOut(); }}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link to="/auth">Sign in</Link>
                    </Button>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link to="/rooms">Book Now</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
