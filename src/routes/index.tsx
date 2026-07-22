import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  MessageSquare, Brain, ScanLine, Package, ShoppingBag, Users, BarChart3,
  Sparkles, Shield, Check, X, ChevronDown, Play, Pause, Volume2, VolumeX,
  RotateCcw, Mic, Receipt, FileText, MessageCircle, Wallet, TrendingUp,
  Globe, Zap, Star, ArrowRight, Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/fb/Button";
import { cn } from "@/lib/utils";
import heroFashion from "@/assets/landing/hero-sme-fashion.jpg";
import heroRetail from "@/assets/landing/hero-sme-retail.jpg";
import heroRestaurant from "@/assets/landing/hero-sme-restaurant.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreBob — Your Smart Business Assistant for African SMEs" },
      { name: "description", content: "FreBob helps African business owners organise conversations, customers, orders, inventory and business records in one trusted place." },
      { property: "og:title", content: "FreBob — Your Smart Business Assistant for African SMEs" },
      { property: "og:description", content: "Run your business with a smarter assistant. Built for African SMEs — starting in Nigeria." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://frebob-ai-buddy.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://frebob-ai-buddy.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  // Silently forward already-signed-in users to their dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, business_setup_completed")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!profile?.onboarding_completed) navigate({ to: "/onboarding" });
      else if (!profile?.business_setup_completed) navigate({ to: "/business-setup" });
      else navigate({ to: "/dashboard" });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <main id="main" className="min-h-dvh bg-background text-foreground overflow-x-hidden">
      <TopNav />
      <Hero />
      <TrustedFor />
      <FrustrationReel />
      <HowItWorks />
      <FeatureSection />
      <AISection />
      <WhyDifferent />
      <ProductScreens />
      <LanguagesSection />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}

/* ---------------- Top Navigation ---------------- */

function TopNav() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#features", label: "Features" },
    { href: "#how", label: "How it works" },
    { href: "#ai", label: "Assistant" },
    { href: "#faq", label: "FAQ" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <Logo size={32} />
          <span className="font-display font-bold text-lg tracking-tight">
            <span className="text-foreground">Fre</span><span className="text-accent">Bob</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">{l.label}</a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link to="/signin"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/signup"><Button variant="primary" size="sm">Get Started</Button></Link>
        </div>
        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open ? (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground py-1.5">{l.label}</a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/signin" className="flex-1"><Button variant="outline" size="sm" className="w-full">Sign in</Button></Link>
              <Link to="/signup" className="flex-1"><Button variant="primary" size="sm" className="w-full">Get Started</Button></Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="relative hero-glow">
      <div className="absolute inset-0 pointer-events-none opacity-70 [background:radial-gradient(600px_300px_at_50%_0%,color-mix(in_oklab,#5d2ac2_10%,transparent),transparent)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center relative">
        <div className="flex flex-col gap-6 lg:pr-6">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Your Business Assistant
          </span>
          <h1 className="text-[2rem] sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight break-words">
            Run Your Business with a{" "}
            <span className="brand-gradient-text">Smarter Assistant</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            FreBob helps African business owners organise conversations, customers,
            orders, inventory and business records in one trusted place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/signup"><Button variant="primary" size="lg" className="w-full sm:w-auto">Create Free Account <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/signin"><Button variant="outline" size="lg" className="w-full sm:w-auto">Explore Demo</Button></Link>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-primary" /> Built for African SMEs. Starting in Nigeria.
          </p>
        </div>

        <div className="flex flex-col gap-5 lg:pl-2">
          <HeroComposition />
          <SwipeableCards />
        </div>
      </div>
    </section>
  );
}

function HeroComposition() {
  return (
    <div className="relative">
      {/* Photo mosaic — real African SME imagery */}
      <div className="relative grid grid-cols-5 grid-rows-6 gap-2 sm:gap-3 aspect-[4/5] sm:aspect-[5/4] rounded-3xl overflow-hidden shadow-elegant">
        {/* Primary image — fashion designer */}
        <div className="relative col-span-3 row-span-6 overflow-hidden rounded-2xl">
          <img
            src={heroFashion}
            alt="Nigerian fashion designer reviewing customer orders on her phone in her tailoring atelier"
            className="h-full w-full object-cover"
            width={1024}
            height={1280}
            fetchPriority="high"
          />
          {/* Readable overlay — purple/black to transparent, biased to the bottom-left where copy sits */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1a0a3a]/60 via-[#1a0a3a]/20 to-transparent" aria-hidden />
        </div>

        {/* Secondary image — retail shop owner */}
        <div className="relative col-span-2 row-span-3 overflow-hidden rounded-2xl">
          <img
            src={heroRetail}
            alt="Nigerian shop owner checking inventory on his smartphone in his retail store"
            className="h-full w-full object-cover"
            width={1024}
            height={1024}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1a0a3a]/40" aria-hidden />
        </div>

        {/* Tertiary image — restaurant owner */}
        <div className="relative col-span-2 row-span-3 overflow-hidden rounded-2xl">
          <img
            src={heroRestaurant}
            alt="Nigerian restaurant owner reviewing daily business records on her phone at her food counter"
            className="h-full w-full object-cover"
            width={1024}
            height={1024}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0a3a]/50 via-transparent to-transparent" aria-hidden />
        </div>
      </div>

      {/* Floating glass assistant preview — clearly labelled sample data */}
      <div
        className="absolute -bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[300px] rounded-2xl liquid-glass shadow-elegant p-4 border border-white/40"
        role="complementary"
        aria-label="Sample assistant preview"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full brand-gradient grid place-items-center text-primary-foreground shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">Good morning, Amaka</div>
            <div className="text-[11px] text-muted-foreground">Sample preview</div>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 text-[13px] text-foreground">
          <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> 3 pending orders</li>
          <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> 2 customers with outstanding balances</li>
          <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-destructive" /> 4 products running low</li>
        </ul>
        <Link
          to="/signin"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl brand-gradient text-primary-foreground text-sm font-semibold px-4 py-2.5 focus-ring hover:opacity-95 transition"
        >
          Ask Bob <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ---------------- Swipeable Cards ---------------- */

const heroCards = [
  { icon: MessageSquare, title: "Chat (Bob)", desc: "Ask questions, get evidence-backed answers.", tint: "from-primary/15 to-primary/5" },
  { icon: Brain, title: "Business Memory", desc: "The trusted brain of your business.", tint: "from-accent/15 to-accent/5" },
  { icon: ScanLine, title: "Scanner", desc: "Receipts and invoices into records.", tint: "from-primary/15 to-accent/5" },
  { icon: Package, title: "Inventory", desc: "Track products and low-stock alerts.", tint: "from-accent/15 to-primary/5" },
  { icon: ShoppingBag, title: "Orders", desc: "Track orders, items and payments.", tint: "from-primary/15 to-primary/5" },
  { icon: Users, title: "Customers", desc: "History, balances and interactions.", tint: "from-accent/10 to-primary/10" },
  { icon: BarChart3, title: "Reports", desc: "Intelligent business insights.", tint: "from-primary/10 to-accent/10" },
];

function SwipeableCards() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = scrollerRef.current; if (!el) return;
    const idx = Math.round(el.scrollLeft / (el.clientWidth * 0.75));
    setActive(Math.min(heroCards.length - 1, Math.max(0, idx)));
  };
  const scrollTo = (i: number) => {
    const el = scrollerRef.current; if (!el) return;
    el.scrollTo({ left: i * el.clientWidth * 0.75, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") scrollTo(Math.min(active + 1, heroCards.length - 1));
          if (e.key === "ArrowLeft") scrollTo(Math.max(active - 1, 0));
        }}
        tabIndex={0}
        role="region"
        aria-label="Feature preview cards"
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {heroCards.map((c) => (
          <a
            key={c.title}
            href="#features"
            className={cn(
              "snap-start shrink-0 w-[72%] sm:w-[46%] rounded-2xl glass-card p-4 hover:-translate-y-0.5 transition-transform",
              "bg-gradient-to-br",
              c.tint,
            )}
          >
            <div className="h-10 w-10 rounded-xl brand-gradient text-primary-foreground grid place-items-center">
              <c.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 font-semibold text-foreground">{c.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
          </a>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Card pagination">
        {heroCards.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            aria-label={`Show card ${i + 1}`}
            onClick={() => scrollTo(i)}
            className={cn("h-1.5 rounded-full transition-all", i === active ? "w-6 bg-primary" : "w-1.5 bg-border")}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Frustration Reel (auto-scrolling videos) ---------------- */

import frustratedAlaba from "@/assets/landing/frustrated-alaba.mp4.asset.json";
import frustratedWhatsapp from "@/assets/landing/frustrated-whatsapp.mp4.asset.json";
import frustratedCV from "@/assets/landing/frustrated-computer-village.mp4.asset.json";

// A single unified reel — 9 real short clips in one continuous marquee row.
// The three source videos are reused; each card gets its own honest label and
// caption per category. Only the marquee plays automatically (muted, looped).
const reelClips: { src: string; label: string; caption: string }[] = [
  { src: frustratedAlaba.url,    label: "Alaba International Market", caption: "Notebooks lost. Customers waiting." },
  { src: frustratedWhatsapp.url, label: "WhatsApp Vendor",            caption: "1,200 chats. Which one paid?" },
  { src: frustratedCV.url,       label: "Computer Village, Ikeja",     caption: "Receipts everywhere. Profit unclear." },
  { src: frustratedWhatsapp.url, label: "Fashion Designer",            caption: "Lost customer conversations across WhatsApp." },
  { src: frustratedAlaba.url,    label: "Retail Shop",                 caption: "Stock confusion — what sold, what's left?" },
  { src: frustratedCV.url,       label: "Restaurant / Food",           caption: "Forgotten orders and unrecorded takings." },
  { src: frustratedWhatsapp.url, label: "Beauty / Salon",              caption: "Scattered receipts and missed payments." },
  { src: frustratedAlaba.url,    label: "Pharmacy / Health Retail",    caption: "Unrecorded stock movement and evidence." },
  { src: frustratedCV.url,       label: "Professional Service",        caption: "Hard to see how the month is really going." },
];

function FrustrationReel() {
  // Duplicate the list so the marquee loops seamlessly.
  const loop = [...reelClips, ...reelClips];
  return (
    <section aria-label="The daily reality for African SMEs" className="py-12 sm:py-16 bg-muted/30 border-y border-border/60 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6 sm:mb-8 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> The daily reality
        </div>
        <h2 className="mt-3 text-2xl sm:text-4xl font-bold text-foreground">
          Running a business shouldn't feel like this.
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-2">
          From Alaba to Computer Village to WhatsApp DMs — across every kind of business,
          vendors lose hours to scattered notes, missed payments and chaos.
        </p>
      </div>

      <div
        className="relative"
        style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
      >
        <div className="flex gap-3 sm:gap-5 w-max animate-[reelScroll_80s_linear_infinite] hover:[animation-play-state:paused]">
          {loop.map((clip, i) => (
            <figure
              key={i}
              className="shrink-0 w-[200px] sm:w-[240px] md:w-[280px] aspect-[9/16] rounded-2xl overflow-hidden relative shadow-card bg-black"
            >
              <video
                src={clip.src}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                <div className="text-[10px] uppercase tracking-wider text-white/70 truncate">{clip.label}</div>
                <div className="text-xs sm:text-sm font-medium text-white mt-0.5">{clip.caption}</div>
              </div>
            </figure>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground px-4">
        Illustrative footage — sample scenarios, not real FreBob customers.
      </p>

      <style>{`@keyframes reelScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}

/* ---------------- Trusted For ---------------- */



function TrustedFor() {
  const industries = [
    "Fashion Designers", "Retail Shops", "Grocery Stores", "Restaurants",
    "Pharmacies", "Beauty Businesses", "Service Providers", "Small Businesses",
  ];
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">Trusted for</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-3">
          {industries.map((i) => (
            <span key={i} className="rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
              {i}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */

function HowItWorks() {
  const steps = [
    { icon: MessageSquare, title: "Share", body: "Paste a chat, upload a voice note, or scan a receipt." },
    { icon: Sparkles, title: "Bob drafts it", body: "The details become a clean, structured record." },
    { icon: Shield, title: "You approve", body: "Nothing is saved until you review and confirm." },
    { icon: Brain, title: "Business Memory", body: "Approved records connect customers, orders and inventory." },
  ];
  return (
    <section id="how" className="py-16 sm:py-20 lg:py-24 bg-surface-warm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHead
          eyebrow="How it works"
          title="From conversation to confident decisions"
          subtitle="A single flow keeps every part of your business connected."
        />
        <ol className="mt-10 sm:mt-14 relative grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="hidden lg:block absolute inset-x-0 top-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden />
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-border bg-background p-5 shadow-card animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">Step {i + 1}</span>
              </div>
              <div className="mt-3 font-display font-semibold">{s.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.body}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Features ---------------- */

function FeatureSection() {
  const features = [
    { icon: MessageSquare, title: "Chat (Bob)", body: "Ask questions about your business and receive evidence-backed answers.", tag: "AI" },
    { icon: ScanLine, title: "Scanner", body: "Convert receipts, invoices and documents into structured records.", tag: "Vision" },
    { icon: Brain, title: "Business Memory", body: "The trusted brain of your business — only approved information is stored.", tag: "Core" },
    { icon: Users, title: "Customers", body: "Manage customer information, history, balances and interactions.", tag: "" },
    { icon: ShoppingBag, title: "Orders", body: "Products, status, payment records, attachments and notes.", tag: "Payment Records" },
    { icon: Package, title: "Inventory", body: "Track products, stock movement and low inventory alerts.", tag: "" },
    { icon: BarChart3, title: "Reports", body: "Sales, expenses, inventory, customers and business trends.", tag: "Insights" },
  ];
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Features" title="Everything an operator needs. Nothing you don't." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <article
              key={f.title}
              className={cn(
                "group relative rounded-3xl border border-border bg-background p-6 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-all",
                i === 2 && "lg:col-span-1 lg:row-span-1 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/15",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="h-11 w-11 rounded-2xl brand-gradient grid place-items-center text-primary-foreground shadow-soft">
                  <f.icon className="h-5 w-5" />
                </div>
                {f.tag ? <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-1">{f.tag}</span> : null}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              {f.title === "Orders" ? (
                <p className="mt-3 text-[11px] text-muted-foreground italic">FreBob does not process payments. It records payment history for business tracking.</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- AI Section ---------------- */

function AISection() {
  const abilities = [
    "Understand conversations",
    "Read business documents",
    "Organise information",
    "Answer your questions",
    "Explain your reports",
    "Generate business insights",
  ];
  return (
    <section id="ai" className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 hero-glow opacity-70 pointer-events-none" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <SectionHead
              eyebrow="Meet Bob"
              title={<>AI that <span className="brand-gradient-text">understands</span> your business</>}
              subtitle="Bob reads conversations, receipts and documents, then organises them into records you can trust. Every insight is backed by your own approved information."
              align="left"
            />
            <ul className="mt-8 grid sm:grid-cols-2 gap-3">
              {abilities.map((a) => (
                <li key={a} className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 backdrop-blur px-4 py-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/15 text-accent grid place-items-center"><Zap className="h-4 w-4" /></div>
                  <span className="text-sm font-medium">{a}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm text-foreground">
                Human approval is required before any information enters Business Memory.
                FreBob assists you — it doesn't replace the business owner.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-elegant">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="h-10 w-10 rounded-full brand-gradient grid place-items-center text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
              <div>
                <div className="font-semibold">Bob</div>
                <div className="text-xs text-muted-foreground">Your business assistant</div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-muted px-4 py-3 text-sm w-fit max-w-[85%]">How is my business doing this week?</div>
              <div className="rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3 text-sm w-fit max-w-[92%]">
                <div className="font-semibold text-primary">Good — with one thing to watch</div>
                <ul className="mt-2 text-[13px] text-foreground space-y-1">
                  <li>• Sales up 18% vs last week (₦742k)</li>
                  <li>• 3 customers owe you ₦46,000</li>
                  <li>• Ankara stock is low — reorder soon</li>
                </ul>
                <div className="mt-2 text-[11px] text-muted-foreground">Evidence: 24 approved records</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Why Different ---------------- */

function WhyDifferent() {
  const traditional = ["Manual entry", "Separate tools", "Static reports", "Limited context"];
  const frebob = ["AI-assisted capture", "Human-reviewed records", "Connected Business Memory", "Evidence-backed insights", "Built for African SMEs"];
  return (
    <section className="py-20 lg:py-28 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Why FreBob is different" title="A category shift, not another tool." />
        <div className="mt-12 grid md:grid-cols-2 gap-5">
          <div className="rounded-3xl border border-border bg-background p-6 sm:p-8">
            <div className="text-sm font-semibold text-muted-foreground">Traditional Apps</div>
            <ul className="mt-4 space-y-3">
              {traditional.map((t) => (
                <li key={t} className="flex items-center gap-3 text-foreground/80">
                  <X className="h-4 w-4 shrink-0 text-destructive" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 sm:p-8 shadow-elegant">
            <div className="text-sm font-semibold text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" /> FreBob</div>
            <ul className="mt-4 space-y-3">
              {frebob.map((t) => (
                <li key={t} className="flex items-center gap-3 text-foreground">
                  <Check className="h-4 w-4 shrink-0 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Product Screens Carousel ---------------- */

function ProductScreens() {
  const screens: { title: string; body: React.ReactNode }[] = [
    { title: "Dashboard", body: <MockDashboard /> },
    { title: "Chat (Bob)", body: <MockChat /> },
    { title: "Scanner", body: <MockScanner /> },
    { title: "Customers", body: <MockList title="Customers" items={["Amaka Okafor", "Segun Bello", "Halima Yusuf", "Chidi Okonkwo"]} /> },
    { title: "Orders", body: <MockList title="Orders" items={["#A-108 · ₦18,000 · Unpaid", "#A-107 · ₦42,500 · Paid", "#A-106 · ₦9,200 · Deposit"]} /> },
    { title: "Inventory", body: <MockList title="Inventory" items={["Ankara — 12 yards", "Aso-Oke — 4 yards (low)", "Lace — 22 yards"]} /> },
    { title: "Reports", body: <MockDashboard variant="reports" /> },
    { title: "Settings", body: <MockList title="Settings" items={["Business profile", "Team & roles", "Language & voice", "Notifications"]} /> },
  ];
  const [i, setI] = useState(0);
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Product" title="Made for the way African businesses actually work." />
        <div className="mt-10 grid lg:grid-cols-[300px_1fr] gap-6">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {screens.map((s, idx) => (
              <button
                key={s.title}
                onClick={() => setI(idx)}
                className={cn(
                  "shrink-0 text-left px-4 py-3 rounded-2xl border transition-all",
                  i === idx ? "bg-primary text-primary-foreground border-primary shadow-elegant" : "bg-background border-border hover:border-primary/30",
                )}
              >
                <div className="text-sm font-semibold">{s.title}</div>
              </button>
            ))}
          </div>
          <div className="rounded-3xl border border-border bg-gradient-to-br from-surface to-background p-4 sm:p-6 min-h-[420px]">
            <div className="rounded-2xl bg-background border border-border shadow-card p-4 sm:p-6 h-full">
              {screens[i].body}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockDashboard({ variant }: { variant?: "reports" }) {
  const cards = variant === "reports"
    ? [["Sales", "₦742,500", "+18%"], ["Expenses", "₦183,200", "-4%"], ["Profit", "₦559,300", "+22%"]]
    : [["Today", "₦142,500", "+18%"], ["Owed to you", "₦46,000", "3 customers"], ["Low stock", "2 items", "reorder"]];
  return (
    <div>
      <div className="text-xs text-muted-foreground">{variant === "reports" ? "This month" : "Overview"}</div>
      <div className="mt-2 text-2xl font-display font-bold">{variant === "reports" ? "Business Reports" : "Good morning, Amaka"}</div>
      <div className="mt-5 grid sm:grid-cols-3 gap-3">
        {cards.map(([k, v, m]) => (
          <div key={k} className="rounded-2xl border border-border p-4 bg-surface">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-1 text-xl font-bold">{v}</div>
            <div className="text-[11px] text-success mt-1">{m}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm">
        <div className="font-semibold text-primary">Bob's summary</div>
        <div className="text-muted-foreground mt-1">Sales trending up. 3 balances outstanding. Reorder Aso-Oke this week.</div>
      </div>
    </div>
  );
}

function MockChat() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="rounded-2xl bg-muted px-4 py-3 text-sm w-fit max-w-[80%]">Which customer owes me the most?</div>
      <div className="rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3 text-sm w-fit max-w-[85%]">
        Segun Bello — ₦24,000 unpaid from order #A-104.
        <div className="text-[11px] text-muted-foreground mt-1">Evidence: 2 approved records</div>
      </div>
      <div className="rounded-2xl bg-muted px-4 py-3 text-sm w-fit max-w-[80%]">Send him a friendly reminder</div>
      <div className="rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3 text-sm w-fit max-w-[85%]">Drafted for your approval — want me to open it in WhatsApp?</div>
    </div>
  );
}

function MockScanner() {
  return (
    <div className="grid sm:grid-cols-2 gap-4 h-full">
      <div className="rounded-2xl bg-surface border border-dashed border-border grid place-items-center min-h-[220px]">
        <div className="text-center text-muted-foreground">
          <ScanLine className="h-8 w-8 mx-auto text-primary" />
          <div className="mt-2 text-sm">Receipt uploaded</div>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold">Extracted items</div>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between rounded-xl bg-surface px-3 py-2"><span>Rice 5kg</span><span>₦7,500</span></li>
          <li className="flex justify-between rounded-xl bg-surface px-3 py-2"><span>Groundnut oil</span><span>₦4,200</span></li>
          <li className="flex justify-between rounded-xl bg-surface px-3 py-2"><span>Salt</span><span>₦600</span></li>
        </ul>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm">Edit</Button>
          <Button variant="primary" size="sm">Approve</Button>
        </div>
      </div>
    </div>
  );
}

function MockList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-3 divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {items.map((it) => (
          <div key={it} className="px-4 py-3 text-sm flex items-center justify-between hover:bg-muted/50">
            <span>{it}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Languages ---------------- */

function LanguagesSection() {
  return (
    <section className="py-20 lg:py-28 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Languages" title="Speaks the way your customers do." />
        <div className="mt-12 grid md:grid-cols-2 gap-5">
          <div className="rounded-3xl border border-border bg-background p-6 sm:p-8">
            <div className="flex items-center gap-2 text-primary"><Globe className="h-5 w-5" /><div className="font-semibold">Interface</div></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["English", "Nigerian Pidgin", "Yoruba", "Hausa", "Igbo"].map((l) => (
                <span key={l} className="rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm">{l}</span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-background p-6 sm:p-8">
            <div className="flex items-center gap-2 text-accent"><Mic className="h-5 w-5" /><div className="font-semibold">Voice</div></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["English", "Yoruba", "Hausa", "Igbo"].map((l) => (
                <span key={l} className="rounded-full bg-accent/10 text-accent px-3 py-1.5 text-sm">{l}</span>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Nigerian Pidgin voice support is coming soon.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */

function Testimonials() {
  const items = [
    { name: "Amaka O.", role: "Fashion designer, Lagos", body: "Bob turned a week of WhatsApp chats into a clean order list in minutes." },
    { name: "Segun B.", role: "Grocery shop owner, Ibadan", body: "I finally know who owes me without flipping through a notebook." },
    { name: "Halima Y.", role: "Beauty business, Abuja", body: "Scanning receipts and getting instant reports feels like magic." },
  ];
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Testimonials" title="Loved by operators." subtitle="Sample testimonials shown for illustration." />
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {items.map((t) => (
            <figure key={t.name} className="rounded-3xl border border-border bg-background p-6 shadow-card">
              <div className="flex gap-1 text-accent">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <blockquote className="mt-3 text-foreground">"{t.body}"</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full brand-gradient grid place-items-center text-primary-foreground text-xs font-semibold">
                  {t.name.split(" ").map((s) => s[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground bg-muted rounded-full px-2 py-1">Sample</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

function FAQ() {
  const faqs = [
    { q: "What is FreBob?", a: "FreBob is an AI-powered business operating system for African SMEs. It turns everyday conversations, receipts and documents into trusted business records, organised operations and smarter decisions." },
    { q: "How does the AI work?", a: "Bob reads what you share — chats, voice notes, receipts — and drafts structured records. You review and approve before anything is saved to your Business Memory." },
    { q: "Can FreBob process payments?", a: "No. FreBob helps businesses organise and track payment records, but it does not process or receive payments." },
    { q: "Can I use FreBob offline?", a: "You can capture voice notes, receipts and drafts offline. Records sync and get processed when you're back online." },
    { q: "How secure is my data?", a: "Your data is scoped to your business with row-level security. Sensitive numbers are redacted before AI processing, and human approval is required before information enters Business Memory." },
    { q: "Can I use FreBob without WhatsApp?", a: "Yes. FreBob works with pasted messages, uploaded voice notes, scanned receipts and manual entry — WhatsApp is optional." },
  ];
  return (
    <section id="faq" className="py-20 lg:py-28 bg-surface">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow="FAQ" title="Answers to the questions we hear most." />
        <div className="mt-10 divide-y divide-border rounded-3xl border border-border bg-background overflow-hidden">
          {faqs.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} className="group">
      <summary className="flex items-center justify-between gap-4 px-5 sm:px-6 py-5 cursor-pointer list-none">
        <span className="font-semibold text-foreground">{q}</span>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </summary>
      <div className="px-5 sm:px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</div>
    </details>
  );
}

/* ---------------- Final CTA ---------------- */

function FinalCTA() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 lg:p-16 text-center brand-gradient text-primary-foreground shadow-elegant">
          <div className="absolute inset-0 [background:radial-gradient(500px_240px_at_20%_0%,rgba(255,255,255,0.15),transparent),radial-gradient(500px_240px_at_100%_100%,rgba(247,147,30,0.35),transparent)] pointer-events-none" />
          <h2 className="relative text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
            Start running your business smarter today.
          </h2>
          <p className="relative mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Join African SMEs turning everyday chaos into clarity with Bob.
          </p>
          <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup">
              <Button variant="accent" size="lg" className="w-full sm:w-auto">Create Free Account <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/signin">
              <Button size="lg" className="w-full sm:w-auto bg-white/10 text-white hover:bg-white/20 border border-white/30">Explore Demo</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  const groups = [
    { title: "Product", links: [["Features", "#features"], ["Pricing", "#"], ["Help Centre", "#"]] as const },
    { title: "Company", links: [["Blog", "#"], ["Careers", "#"], ["Contact", "#"]] as const },
    { title: "Legal", links: [["Privacy Policy", "#"], ["Terms", "#"]] as const },
  ];
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-display font-bold text-lg"><span className="text-foreground">Fre</span><span className="text-accent">Bob</span></span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">The AI business operating system for African SMEs.</p>
          <div className="mt-4 flex gap-3 text-muted-foreground">
            {["X", "IG", "LI", "YT"].map((s) => (
              <a key={s} href="#" aria-label={s} className="h-9 w-9 grid place-items-center rounded-xl border border-border hover:border-primary/30 hover:text-foreground text-xs font-semibold">{s}</a>
            ))}
          </div>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{g.title}</div>
            <ul className="mt-4 space-y-2 text-sm [overflow-wrap:anywhere]">
              {g.links.map(([label, href]) => (
                <li key={label}><a href={href} className="text-foreground/80 hover:text-primary">{label}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FreBob · Built for African SMEs · v1.0.0
      </div>
    </footer>
  );
}

/* ---------------- Shared ---------------- */

function SectionHead({
  eyebrow, title, subtitle, align = "center",
}: { eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; align?: "center" | "left" }) {
  return (
    <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "")}>
      {eyebrow ? <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">{eyebrow}</div> : null}
      <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-4 text-muted-foreground text-lg">{subtitle}</p> : null}
    </div>
  );
}
