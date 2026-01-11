import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Shield, Clock, Star, Zap, CheckCircle2, Menu } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      {/* Navbar */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">ServicePro</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="hidden md:flex">Sign in</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(var(--primary),0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
        <div className="container mx-auto px-6 text-center">
          <div className="mx-auto max-w-4xl animate-fade-in">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Now available in your area
            </div>
            <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
              Home services, <span className="text-primary">elevated.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto text-pretty">
              Connect with verified top-tier professionals for repairs, maintenance, and improvements. Experience the new standard in home care.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="px-8 h-12 text-base rounded-full shadow-lg hover:shadow-xl transition-all">
                  Book a Service
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="lg" variant="outline" className="px-8 h-12 text-base rounded-full bg-background/50 backdrop-blur-sm">
                  Become a Pro
                </Button>
              </Link>
            </div>

            {/* Visual Element / Mockup */}
            <div className="mt-20 relative mx-auto max-w-5xl rounded-xl border bg-card/50 p-2 shadow-2xl backdrop-blur-sm lg:rounded-2xl lg:p-4">
              <div className="aspect-[16/9] overflow-hidden rounded-lg bg-muted/50 border flex items-center justify-center">
                {/* Placeholder for Product Image - Using Code for now */}
                <div className="text-center space-y-4 p-8">
                  <div className="flex gap-4 justify-center">
                    <div className="h-32 w-24 bg-background rounded-lg shadow-md border animate-slide-up" style={{ animationDelay: "0.1s" }}></div>
                    <div className="h-32 w-24 bg-background rounded-lg shadow-md border animate-slide-up mt-8" style={{ animationDelay: "0.2s" }}></div>
                    <div className="h-32 w-24 bg-background rounded-lg shadow-md border animate-slide-up" style={{ animationDelay: "0.3s" }}></div>
                  </div>
                  <p className="text-sm text-muted-foreground">Detailed provider profiles & instant booking.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="border-y border-border/40 bg-muted/30 py-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-6">TRUSTED BY HOMEOWNERS AND TECHNICIANS</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center justify-center font-bold text-xl">ACME Corp</div>
            <div className="flex items-center justify-center font-bold text-xl">FixIt</div>
            <div className="flex items-center justify-center font-bold text-xl">HomeSafe</div>
            <div className="flex items-center justify-center font-bold text-xl">UrbanPro</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need</h2>
            <p className="mt-4 text-lg text-muted-foreground">Streamlined for reliability and peace of mind.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-2xl border p-8 hover:border-primary/50 transition-colors bg-card hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Verified Professionals</h3>
              <p className="mt-2 text-muted-foreground">
                Every technician undergoes a rigorous background check and skill assessment.
              </p>
            </div>

            <div className="group rounded-2xl border p-8 hover:border-primary/50 transition-colors bg-card hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Instant Booking</h3>
              <p className="mt-2 text-muted-foreground">
                Real-time availability. Book a slot that works for you in under 60 seconds.
              </p>
            </div>

            <div className="group rounded-2xl border p-8 hover:border-primary/50 transition-colors bg-card hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Satisfaction Guarantee</h3>
              <p className="mt-2 text-muted-foreground">
                Payment is held in escrow until the job is completed to your satisfaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 py-12 md:py-16">
        <div className="container mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Shield className="h-5 w-5" />
                </div>
                ServicePro
              </Link>
              <p className="mt-4 text-sm text-muted-foreground max-w-xs">
                Reinventing home services with trust, speed, and quality at the core.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Browse Services</Link></li>
                <li><Link href="#" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="#" className="hover:text-foreground">For Business</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">About</Link></li>
                <li><Link href="#" className="hover:text-foreground">Careers</Link></li>
                <li><Link href="#" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="#" className="hover:text-foreground">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 ServicePro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
