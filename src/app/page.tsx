import Link from "next/link";
import {
  CheckCircle,
  FileText,
  Mail,
  Camera,
  Shield,
  Zap,
  Users,
  Star,
  ChevronRight,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-1">
          <span className="text-xl font-bold text-brand-800">Job Tracker</span>
          <span className="text-xl font-bold text-accent-700">Pro</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/pricing"      className="hover:text-brand-800">Pricing</Link>
          <Link href="/#features"    className="hover:text-brand-800">Features</Link>
          <Link href="/#how-it-works" className="hover:text-brand-800">How It Works</Link>
          <Link href="/contact"      className="hover:text-brand-800">Contact</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href="/register"><Button size="sm">Start Free</Button></Link>
        </div>
      </div>
    </header>
  );
}

const features = [
  { Icon: FileText,   title: "Instant PDF Reports",    desc: "Professional branded PDF generated the second a job is marked complete — no manual work." },
  { Icon: Mail,       title: "Auto-Email to Customer", desc: "Report delivered to your customer's inbox before your tech even leaves the driveway." },
  { Icon: CheckCircle,title: "Smart Checklists",       desc: "Pre-loaded templates for HVAC, garage door, plumbing, electrical, and general work." },
  { Icon: Camera,     title: "Photo Documentation",    desc: "Before/after photos from your phone's camera embedded directly into the report." },
  { Icon: Shield,     title: "Reduce Callbacks",       desc: "Every visit documented with timestamps and tech signature — your legal protection." },
  { Icon: Users,      title: "Multi-Tech Teams",       desc: "Add your entire crew. Each tech completes their own reports from any phone." },
  { Icon: Zap,        title: "60-Second Workflow",     desc: "Simple enough for a tech to use standing in a driveway after a long job in the heat." },
  { Icon: Star,       title: "5-Star Impressions",     desc: "Customers who receive a professional report after every visit become raving fans." },
];

const steps = [
  { n: "1", title: "Tech completes the job",         desc: "Your technician opens Job Tracker Pro on their phone, fills in customer info, checks off the job checklist, snaps a few photos." },
  { n: "2", title: 'Tap "Complete &amp; Send Report"',   desc: "Job Tracker Pro instantly generates a branded PDF report with all checklist items, notes, and photos embedded." },
  { n: "3", title: "Customer receives their report", desc: "The PDF arrives in the customer's email within seconds — professional, branded, and complete." },
];

const faqs = [
  { q: "Do I need to install anything?",           a: "No. Job Tracker Pro is 100% web-based. Your techs open a link on their phone — no app store needed." },
  { q: "Which industries does Job Tracker Pro support?",a: "HVAC, garage door, plumbing, electrical, and general service — with built-in checklist templates for each." },
  { q: "Is it really free?",                        a: "Yes. The Free plan includes 5 jobs per month and 1 technician. Perfect for getting started." },
  { q: "Do you serve Tampa Bay businesses?",        a: "Job Tracker Pro was designed with Tampa Bay, St. Petersburg, and Clearwater service businesses in mind. Your local market, your local needs." },
];

export default function LandingPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name:    f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-white">
        <MarketingNav />

        {/* Hero */}
        <section className="relative overflow-hidden bg-linear-to-br from-brand-950 via-brand-900 to-brand-800 px-4 py-20 sm:py-28">
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-700 bg-brand-900/60 px-4 py-1.5 text-sm font-medium text-brand-200">
              <span className="h-2 w-2 rounded-full bg-success-700" />
              Built for Tampa Bay Service Businesses
            </div>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Stop Losing Customers<br />
              <span className="text-accent-500">to Sloppy Paper Forms</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-200 sm:text-xl">
              Job Tracker Pro lets your HVAC, garage door, and plumbing techs complete a digital
              checklist with photos on their phone — then auto-emails a branded PDF report
              to the customer <strong className="text-white">before they leave the driveway</strong>.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-accent-700 hover:bg-accent-600 text-white shadow-lg">
                  Start Free — No Card Needed <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="border-brand-600 text-brand-100 hover:bg-brand-800">
                  See How It Works
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-brand-400">Free plan includes 5 jobs/month. No credit card required.</p>
          </div>
        </section>

        {/* Social proof bar */}
        <div className="border-y border-slate-100 bg-slate-50 py-4">
          <p className="text-center text-sm font-medium text-slate-500">
            Trusted by service companies across{" "}
            <span className="font-semibold text-slate-700">Tampa · St. Petersburg · Clearwater · Bradenton · Sarasota</span>
          </p>
        </div>

        {/* Features */}
        <section id="features" className="py-20 px-4">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="page-title">Everything Your Team Needs</h2>
              <p className="mt-3 text-lg text-slate-500">Designed for techs in the field — simple enough to use after a sweaty job in Florida heat.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ Icon, title, desc }) => (
                <div key={title} className="card-padded flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                    <Icon className="h-5 w-5 text-brand-700" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-slate-50 px-4 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="page-title">Done in 60 Seconds Flat</h2>
              <p className="mt-3 text-lg text-slate-500">No training. No IT department. No learning curve.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.n} className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-800 text-xl font-bold text-white shadow-lg">
                    {step.n}
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tampa Bay focus */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl bg-linear-to-br from-brand-900 to-brand-800 p-8 text-white sm:p-12">
              <h2 className="text-3xl font-bold leading-tight">
                Built for Tampa Bay&apos;s Best Service Professionals
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-brand-200">
                Florida homeowners expect professionalism. When your HVAC tech in Pinellas County
                sends a branded PDF report the moment the job is done, you stand out from every
                other contractor. No more &quot;Did they actually check everything?&quot; callbacks.
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {["Tampa & Hillsborough County","St. Petersburg & Pinellas County","Clearwater Beach to Wesley Chapel","Bradenton, Sarasota & surrounding areas"].map((city) => (
                  <li key={city} className="flex items-center gap-2 text-brand-200">
                    <CheckCircle className="h-4 w-4 text-success-700 shrink-0" />{city}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register">
                  <Button className="bg-accent-700 hover:bg-accent-600 text-white">
                    Get Started Free <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" className="border-brand-600 text-brand-100 hover:bg-brand-800">View Pricing</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-slate-50 px-4 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="page-title text-center">Frequently Asked Questions</h2>
            <div className="mt-8 space-y-4">
              {faqs.map((faq) => (
                <details key={faq.q} className="card-padded group">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-slate-900">
                    {faq.q}
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-slate-500 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-20 text-center">
          <h2 className="page-title">Ready to Impress Every Customer?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            Join Tampa Bay service businesses already saving time and winning more referrals with Job Tracker Pro.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/register"><Button size="lg">Create Free Account <ChevronRight className="h-4 w-4" /></Button></Link>
            <Link href="/pricing"><Button size="lg" variant="outline">See All Plans</Button></Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-slate-900 px-4 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-white">Job Tracker</span>
                  <span className="text-lg font-bold text-accent-500">Pro</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">Job completion reports for Tampa Bay service businesses.</p>
                <p className="mt-1 text-xs text-slate-500">By <a href="https://cliplogicpro.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">Clip Logic LLC</a></p>
                <Link href="/contact" className="mt-3 flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                  <Phone className="h-4 w-4" /> Contact Support
                </Link>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Company</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li><Link href="/pricing"      className="hover:text-white">Pricing</Link></li>
                  <li><Link href="#features"    className="hover:text-white">Features</Link></li>
                  <li><Link href="#how-it-works" className="hover:text-white">How It Works</Link></li>
                  <li><Link href="/contact"      className="hover:text-white">Contact &amp; Support</Link></li>
                  <li><a href="https://agency.cliplogicpro.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">Digital Agency ↗</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Account</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li><Link href="/login"    className="hover:text-white">Sign In</Link></li>
                  <li><Link href="/register" className="hover:text-white">Register</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Industries</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li>HVAC Reports</li><li>Garage Door Reports</li>
                  <li>Plumbing Reports</li><li>Electrical Reports</li>
                </ul>
              </div>
            </div>
            <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
              © {new Date().getFullYear()} Job Tracker Pro by <a href="https://cliplogicpro.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">Clip Logic LLC</a>. Serving Tampa, St. Petersburg, Clearwater, and the greater Tampa Bay area.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

