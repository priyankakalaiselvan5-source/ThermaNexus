'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import {
  Snowflake, BrainCircuit, ShieldCheck, Navigation, Truck, Map,
  Activity, Bell, Users, Building2, ArrowRight, Check, Star,
  Zap, TrendingUp, Globe, Lock, BarChart3, FileText, Siren,
  Thermometer, Gauge, Package, Sparkles, ChevronRight,
} from 'lucide-react';

const FEATURES = [
  { icon: BrainCircuit, title: 'AI Predictive Analytics', desc: 'Gemini-powered models predict spoilage, cooling failures, and remaining safe transport hours before they happen.', color: 'text-primary bg-primary/10' },
  { icon: Navigation, title: 'Intelligent Rerouting', desc: 'AI recommends optimal alternative routes considering traffic, weather, road closures, and nearby cold storage.', color: 'text-accent bg-accent/10' },
  { icon: Siren, title: 'Emergency Rescue', desc: 'Automated SOS workflows trigger rescue protocols, locate nearest cold storage, and notify hospitals instantly.', color: 'text-critical bg-critical/10' },
  { icon: Activity, title: 'Real-Time IoT Monitoring', desc: 'Continuous sensor data: temperature, humidity, pressure, battery, GPS, and door status from every shipment.', color: 'text-warning bg-warning/10' },
  { icon: Map, title: 'Live Interactive Map', desc: 'Track every vehicle, hospital, warehouse, and cold storage facility with animated route visualization.', color: 'text-primary bg-primary/10' },
  { icon: ShieldCheck, title: 'Enterprise Security', desc: 'HIPAA and GDPR ready with RBAC, JWT, MFA, audit logs, and end-to-end encryption.', color: 'text-success bg-success/10' },
];

const STEPS = [
  { num: '01', title: 'Connect IoT Sensors', desc: 'Deploy temperature, humidity, and GPS sensors across your fleet and cold storage facilities.' },
  { num: '02', title: 'AI Monitors & Predicts', desc: 'Our AI engine continuously analyzes sensor data to predict spoilage risk and cooling failures.' },
  { num: '03', title: 'Auto-Reroute & Rescue', desc: 'When risk is detected, the system automatically recommends rerouting and triggers rescue protocols.' },
  { num: '04', title: 'Deliver Safely', desc: 'Medicines arrive at hospitals within safe temperature ranges with full compliance documentation.' },
];

const STATS = [
  { value: 500000, suffix: '+', label: 'Vaccines Protected', icon: Package },
  { value: 99.2, decimals: 1, suffix: '%', label: 'Prediction Accuracy', icon: BrainCircuit },
  { value: 240, suffix: '+', label: 'Hospitals Connected', icon: Building2 },
  { value: 78, suffix: '%', label: 'Reduced Medicine Loss', icon: TrendingUp },
];

const TECH_STACK = [
  { name: 'Next.js', desc: 'React framework' },
  { name: 'Supabase', desc: 'PostgreSQL + Realtime' },
  { name: 'Gemini AI', desc: 'Predictive models' },
  { name: 'Leaflet', desc: 'Interactive maps' },
  { name: 'Recharts', desc: 'Data visualization' },
  { name: 'TypeScript', desc: 'Type-safe code' },
];

const TESTIMONIALS = [
  { name: 'Dr. Anjali Mehta', role: 'Director, National Health Logistics', content: 'ThermaNeXus has transformed our vaccine distribution. The AI predictions have reduced our medicine spoilage by 80%.', rating: 5 },
  { name: 'Rajiv Krishnan', role: 'VP Supply Chain, Apollo Pharma', content: 'The real-time monitoring and emergency rescue features are game-changing. We can now guarantee cold chain integrity.', rating: 5 },
  { name: 'Sarah O\'Connell', role: 'Cold Chain Lead, UNICEF India', content: 'The explainable AI dashboard gives our team confidence in every delivery decision. Truly enterprise-grade.', rating: 5 },
];

const PRICING = [
  { name: 'Starter', price: '₹49,999', period: '/month', desc: 'For regional distributors', features: ['Up to 50 active shipments', 'Real-time IoT monitoring', 'AI risk predictions', 'Email & SMS alerts', '1 organization', '8am-8pm support'], cta: 'Start Free Trial', popular: false },
  { name: 'Professional', price: '₹1,49,999', period: '/month', desc: 'For national logistics networks', features: ['Up to 500 active shipments', 'Everything in Starter', 'Emergency rescue workflows', 'Voice assistant & commands', 'Multi-language support', '10 organizations', '24/7 priority support'], cta: 'Start Free Trial', popular: true },
  { name: 'Enterprise', price: 'Custom', period: '', desc: 'For government & global health', features: ['Unlimited shipments', 'Everything in Professional', 'Custom AI model training', 'Dedicated infrastructure', 'API access & integrations', 'Unlimited organizations', 'Dedicated account manager'], cta: 'Contact Sales', popular: false },
];

const FAQS = [
  { q: 'How does the AI predict medicine spoilage?', a: 'Our Gemini-powered models analyze real-time IoT sensor data (temperature trends, cooling system health, battery levels, and historical patterns) to calculate spoilage probability and remaining safe transport hours with 94%+ accuracy.' },
  { q: 'What happens during an emergency?', a: 'The system automatically detects temperature breaches or cooling failures, triggers an SOS workflow, locates the nearest cold storage facility, recommends a rescue route, and notifies the destination hospital — all within seconds.' },
  { q: 'Is ThermaNeXus compliant with healthcare regulations?', a: 'Yes. The platform is HIPAA and GDPR ready with role-based access control, JWT authentication, MFA, audit logs, and end-to-end encryption for all sensitive data.' },
  { q: 'Can I integrate with my existing fleet management system?', a: 'Yes. ThermaNeXus provides REST APIs and webhooks for seamless integration with existing fleet, warehouse, and hospital management systems.' },
  { q: 'What IoT sensors are supported?', a: 'We support all standard temperature, humidity, pressure, GPS, and door sensors via Bluetooth, LoRaWAN, and cellular connectivity. Our team assists with sensor onboarding.' },
  { q: 'How accurate are the AI predictions?', a: 'Our models achieve 94.2% prediction accuracy on spoilage risk and 91% on cooling failure prediction, validated against millions of real-world shipment data points.' },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardHover = {
  rest: { y: 0 },
  hover: { y: -8, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const } },
};

// Floating particles component
function FloatingParticles() {
  const particles = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    top: Math.random() * 100,
    left: Math.random() * 100,
    duration: Math.random() * 6 + 6,
    delay: Math.random() * 5,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle animate-float-particle"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            top: `${p.top}%`,
            left: `${p.left}%`,
            background: `hsl(${246 + Math.random() * 40} 80% 62% / 0.3)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Glow blobs component
function GlowBlobs({ variant = 'default' }: { variant?: 'default' | 'hero' }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute left-[10%] top-[15%] h-80 w-80 rounded-full bg-primary/20 blur-[100px] animate-mesh-drift"
        style={{ animationDuration: '18s' }}
      />
      <div
        className="absolute right-[15%] top-[30%] h-96 w-96 rounded-full bg-accent/15 blur-[120px] animate-mesh-drift"
        style={{ animationDuration: '22s', animationDelay: '2s' }}
      />
      <div
        className="absolute bottom-[20%] left-[40%] h-72 w-72 rounded-full bg-violet-500/10 blur-[90px] animate-mesh-drift"
        style={{ animationDuration: '20s', animationDelay: '4s' }}
      />
      {variant === 'hero' && (
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px] animate-glow-pulse" />
      )}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-background mesh-gradient noise-overlay">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'glass-strong border-b border-border/60 shadow-sm'
            : 'border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-animated shadow-glow transition-transform duration-300 group-hover:scale-105">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-display text-base font-bold tracking-tight">ThermaNeXus</p>
              <p className="text-[10px] text-muted-foreground">Cold Chain AI</p>
            </div>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {[
              { href: '/#features', label: 'Features' },
              { href: '/#how-it-works', label: 'How It Works' },
              { href: '/#pricing', label: 'Pricing' },
              { href: '/#faq', label: 'FAQ' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link href="/dashboard">
              <Button size="sm" className="gradient-animated text-white gap-1.5 btn-glow">
                Get Started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <GlowBlobs variant="hero" />
        <div className="absolute inset-0 -z-10 grid-overlay opacity-50" />
        <FloatingParticles />
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-32">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-6 gap-1.5 border-primary/30 bg-primary/5 py-1.5 text-primary backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" /> AI-Powered · Enterprise-Grade · WHO Ready
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="font-display text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Predict Risk.<br />
              <span className="gradient-text-animated">Protect Medicines.</span><br />
              Deliver Safely.
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground"
            >
              ThermaNeXus is the AI-powered predictive cold chain rescue platform that monitors temperature-sensitive medicines in real time, predicts spoilage before it happens, and automatically reroutes to save lives.
            </motion.p>
            <motion.div variants={fadeInUp} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard">
                <Button size="lg" className="gradient-animated text-white gap-2 btn-glow">
                  Launch Platform <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/#how-it-works">
                <Button size="lg" variant="outline" className="gap-2 backdrop-blur-sm">
                  <BrainCircuit className="h-4 w-4" /> See How It Works
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={fadeInUp} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> 14-day free trial</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Cancel anytime</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/60 bg-secondary/20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid grid-cols-2 gap-6 md:grid-cols-4"
          >
            {STATS.map((stat) => (
              <motion.div key={stat.label} variants={fadeInUp} className="text-center">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl gradient-animated shadow-glow"
                >
                  <stat.icon className="h-6 w-6 text-white" />
                </motion.div>
                <p className="font-display text-3xl font-bold text-foreground lg:text-4xl">
                  <AnimatedCounter value={stat.value} decimals={stat.decimals || 0} suffix={stat.suffix} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <GlowBlobs />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="outline" className="mb-4 border-primary/20 text-primary backdrop-blur-sm">Features</Badge>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Everything you need to protect the cold chain</motion.h2>
          <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">From real-time monitoring to AI-powered rescue, ThermaNeXus covers every aspect of healthcare logistics.</motion.p>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeInUp} whileHover="hover" initial="rest" animate="rest">
              <Card className="group glass-card gradient-border overflow-hidden transition-shadow duration-300 hover:shadow-premium-lg">
                <CardContent className="p-6">
                  <motion.div
                    variants={cardHover}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.color} transition-transform group-hover:scale-110`}
                  >
                    <f.icon className="h-6 w-6" />
                  </motion.div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative border-y border-border/60 bg-secondary/20 backdrop-blur-sm">
        <div className="absolute inset-0 -z-10 grid-overlay opacity-40" />
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="mx-auto max-w-2xl text-center"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-accent/20 text-accent backdrop-blur-sm">Process</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">How ThermaNeXus works</motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">Four steps from sensor to safe delivery.</motion.p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {STEPS.map((step, i) => (
              <motion.div key={step.num} variants={fadeInUp} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[3.25rem] top-10 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-primary/40 to-transparent lg:block" />
                )}
                <motion.div
                  whileHover={{ scale: 1.05, rotate: -2 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-animated text-xl font-bold text-white shadow-glow"
                >
                  {step.num}
                </motion.div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <GlowBlobs />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeIn}
          className="grid gap-12 lg:grid-cols-2 lg:items-center"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="outline" className="mb-4 border-primary/20 text-primary backdrop-blur-sm">Technology</Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Built on enterprise-grade technology</h2>
            <p className="mt-4 text-muted-foreground">ThermaNeXus leverages the best of modern web, AI, and cloud infrastructure to deliver a platform that scales from regional distributors to national health authorities.</p>
            <motion.div variants={staggerContainer} className="mt-6 space-y-3">
              {TECH_STACK.map((tech) => (
                <motion.div
                  key={tech.name}
                  variants={fadeInUp}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3 backdrop-blur-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">{tech.name}</span>
                  <span className="text-sm text-muted-foreground">{tech.desc}</span>
                  <Check className="ml-auto h-4 w-4 text-success" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div variants={scaleIn}>
            <Card className="glass-card gradient-border overflow-hidden">
              <CardContent className="p-0">
                <div className="gradient-animated p-6 text-white">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    <span className="font-semibold">Live System Metrics</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-6">
                  {[
                    { icon: Thermometer, val: '4.2°C', label: 'Avg temperature', color: 'text-primary' },
                    { icon: Activity, val: '99.9%', label: 'Uptime', color: 'text-accent' },
                    { icon: BrainCircuit, val: '94.2%', label: 'AI accuracy', color: 'text-primary' },
                    { icon: Navigation, val: '340+', label: 'Active routes', color: 'text-success' },
                  ].map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ scale: 1.03 }}
                      className="rounded-xl bg-secondary/50 p-4 backdrop-blur-sm"
                    >
                      <m.icon className={`h-5 w-5 ${m.color}`} />
                      <p className="mt-2 font-display text-2xl font-bold">{m.val}</p>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* Global Impact */}
      <section className="relative border-y border-border/60 bg-secondary/20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="mx-auto max-w-2xl text-center"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-accent/20 text-accent backdrop-blur-sm">Global Impact</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Trusted across India and beyond</motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">From national health logistics to UNICEF vaccine programs, ThermaNeXus powers critical cold chain operations worldwide.</motion.p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="mt-12 grid gap-4 md:grid-cols-3"
          >
            {[
              { icon: Building2, title: 'National Health Authorities', desc: 'Powering vaccine distribution for government health programs across 28 states.' },
              { icon: Globe, title: 'WHO & UNICEF Programs', desc: 'Supporting global immunization initiatives with predictive cold chain intelligence.' },
              { icon: Truck, title: 'Pharma Logistics', desc: 'Enabling pharmaceutical companies to guarantee medicine integrity end-to-end.' },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeInUp} whileHover={{ y: -6 }}>
                <Card className="glass-card gradient-border text-center">
                  <CardContent className="p-6">
                    <motion.div whileHover={{ scale: 1.1 }} className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl gradient-animated shadow-glow">
                      <item.icon className="h-6 w-6 text-white" />
                    </motion.div>
                    <h3 className="mt-4 font-display font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <GlowBlobs />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="outline" className="mb-4 border-primary/20 text-primary backdrop-blur-sm">Testimonials</Badge>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">What our partners say</motion.h2>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="mt-12 grid gap-6 md:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div key={t.name} variants={fadeInUp} whileHover={{ y: -6 }}>
              <Card className="glass-card gradient-border">
                <CardContent className="p-6">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <motion.span key={i} initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                        <Star className="h-4 w-4 fill-warning text-warning" />
                      </motion.span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-foreground">{t.content}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-animated text-sm font-bold text-white shadow-glow">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative border-y border-border/60 bg-secondary/20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="mx-auto max-w-2xl text-center"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-primary/20 text-primary backdrop-blur-sm">Pricing</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Plans for every scale</motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">From regional distributors to national health authorities.</motion.p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="mt-12 grid gap-6 lg:grid-cols-3"
          >
            {PRICING.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                whileHover={{ y: -8 }}
                className={plan.popular ? 'lg:-mt-4' : ''}
              >
                <Card className={`glass-card gradient-border h-full ${plan.popular ? 'border-primary shadow-glow' : ''}`}>
                  {plan.popular && (
                    <div className="gradient-animated rounded-t-2xl py-1.5 text-center text-xs font-semibold text-white">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="p-6">
                    <p className="text-sm font-semibold text-primary">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.desc}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <Button className={`mt-6 w-full ${plan.popular ? 'gradient-animated text-white btn-glow' : ''}`} variant={plan.popular ? 'default' : 'outline'}>
                      {plan.cta}
                    </Button>
                    <div className="mt-6 space-y-3">
                      {plan.features.map((feat) => (
                        <motion.div
                          key={feat}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          <span className="text-muted-foreground">{feat}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative mx-auto max-w-3xl px-4 py-20 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="outline" className="mb-4 border-primary/20 text-primary backdrop-blur-sm">FAQ</Badge>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Frequently asked questions</motion.h2>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="mt-10 space-y-4"
        >
          {FAQS.map((faq) => (
            <motion.div key={faq.q} variants={fadeInUp} whileHover={{ scale: 1.01 }}>
              <Card className="glass-card gradient-border">
                <CardContent className="p-5">
                  <h3 className="font-display font-semibold text-foreground">{faq.q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={scaleIn}
        >
          <Card className="glass-card gradient-border overflow-hidden border-0">
            <div className="gradient-animated relative overflow-hidden px-8 py-16 text-center text-white lg:px-16">
              <FloatingParticles />
              <h2 className="font-display text-balance text-3xl font-bold tracking-tight sm:text-4xl">Ready to protect every dose?</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/90">Join the healthcare logistics revolution. Start your free trial today and see the difference AI-powered cold chain management makes.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/dashboard">
                  <Button size="lg" variant="secondary" className="gap-2 btn-glow">
                    Launch Platform <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm">
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/60 bg-secondary/20 backdrop-blur-sm">
        <div className="absolute inset-0 -z-10 grid-overlay opacity-30" />
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <Link href="/" className="group flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-animated shadow-glow transition-transform group-hover:scale-105">
                  <Snowflake className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-base font-bold">ThermaNeXus</p>
                  <p className="text-[10px] text-muted-foreground">Cold Chain AI</p>
                </div>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">Predict Risk. Protect Medicines. Deliver Safely.</p>
              <div className="mt-4 flex items-center gap-3">
                <Badge variant="outline" className="gap-1 text-success backdrop-blur-sm"><ShieldCheck className="h-3 w-3" /> HIPAA Ready</Badge>
                <Badge variant="outline" className="gap-1 text-success backdrop-blur-sm"><Lock className="h-3 w-3" /> GDPR Ready</Badge>
              </div>
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">Platform</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <Link href="/dashboard" className="block transition-colors hover:text-foreground">Dashboard</Link>
                <Link href="/shipments" className="block transition-colors hover:text-foreground">Shipments</Link>
                <Link href="/map" className="block transition-colors hover:text-foreground">Live Map</Link>
                <Link href="/predictions" className="block transition-colors hover:text-foreground">AI Predictions</Link>
              </div>
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">Resources</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <Link href="/#faq" className="block transition-colors hover:text-foreground">FAQ</Link>
                <Link href="/#pricing" className="block transition-colors hover:text-foreground">Pricing</Link>
                <Link href="/support" className="block transition-colors hover:text-foreground">Support</Link>
                <Link href="/reports" className="block transition-colors hover:text-foreground">Reports</Link>
              </div>
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">Company</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <a className="block transition-colors hover:text-foreground">About Us</a>
                <a className="block transition-colors hover:text-foreground">Contact</a>
                <a className="block transition-colors hover:text-foreground">Privacy Policy</a>
                <a className="block transition-colors hover:text-foreground">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">© 2025 ThermaNeXus. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> English (India)</span>
              <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-success" /> All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
