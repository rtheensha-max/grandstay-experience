import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SOCIALS = [
  { label: "Instagram", icon: Instagram, href: "https://instagram.com" },
  { label: "Facebook", icon: Facebook, href: "https://facebook.com" },
  { label: "Twitter", icon: Twitter, href: "https://twitter.com" },
  { label: "YouTube", icon: Youtube, href: "https://youtube.com" },
];

export function Footer() {
  return (
    <footer className="bg-gradient-espresso text-espresso-foreground">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo light />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-espresso-foreground/70">
            A five-star sanctuary in the heart of the city. Timeless hospitality, award-winning dining and
            spaces designed for rest and celebration.
          </p>
          <div className="mt-6 flex gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="flex size-10 items-center justify-center rounded-full border border-espresso-foreground/20 text-espresso-foreground/80 transition hover:border-gold hover:bg-gold hover:text-gold-foreground"
              >
                <s.icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="eyebrow font-sans! text-gold-light">Explore</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              { to: "/rooms", label: "Rooms & Suites" },
              { to: "/restaurant", label: "Restaurant" },
              { to: "/services", label: "Services" },
              { to: "/offers", label: "Special Offers" },
              { to: "/about", label: "About Us" },
              { to: "/contact", label: "Contact" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-espresso-foreground/75 transition hover:text-gold-light">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="eyebrow font-sans! text-gold-light">Contact</h3>
          <ul className="mt-5 space-y-4 text-sm text-espresso-foreground/75">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
              <span>
                12 Marine Drive, Nariman Point
                <br />
                Mumbai 400021, India
              </span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-gold" />
              <a href="tel:+912266001234" className="hover:text-gold-light">
                +91 22 6600 1234
              </a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-gold" />
              <a href="mailto:stay@grandstayhotel.com" className="hover:text-gold-light">
                stay@grandstayhotel.com
              </a>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="eyebrow font-sans! text-gold-light">Newsletter</h3>
          <p className="mt-5 text-sm text-espresso-foreground/70">
            Members-only rates, seasonal menus and event invitations.
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <Input
              type="email"
              placeholder="Your email"
              aria-label="Email address"
              className="h-11 rounded-full border-espresso-foreground/20 bg-espresso-foreground/5 text-espresso-foreground placeholder:text-espresso-foreground/40 focus-visible:ring-gold"
            />
            <Button type="submit" className="h-11 shrink-0">
              Join
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-espresso-foreground/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-espresso-foreground/50 sm:flex-row">
          <p>© {new Date().getFullYear()} GrandStay Hotel. All rights reserved.</p>
          <p className="flex gap-5">
            <span>Privacy Policy</span>
            <span>Terms of Stay</span>
            <span>Demo — no real payments are processed</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
