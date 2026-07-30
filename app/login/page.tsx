'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Snowflake, Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, Users, Truck, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, getRoleRedirect } from '@/hooks/use-auth';
import { toast } from 'sonner';

const ROLES = [
  { id: 'administrator', label: 'Administrator', icon: ShieldCheck, email: 'admin@thermanexus.com' },
  { id: 'dispatcher', label: 'Dispatcher', icon: Users, email: 'dispatch@thermanexus.com' },
  { id: 'driver', label: 'Driver', icon: Truck, email: 'driver001@thermanexus.com' },
  { id: 'hospital', label: 'Hospital', icon: Building2, email: 'apollo@hospital.com' },
];

// Floating particles for the premium background
function FloatingParticles() {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    size: Math.random() * 5 + 2,
    top: Math.random() * 100,
    left: Math.random() * 100,
    duration: Math.random() * 6 + 7,
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
            background: `hsl(${246 + Math.random() * 40} 80% 62% / 0.35)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('admin@thermanexus.com');
  const [password, setPassword] = useState('thermanexus');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('administrator');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function selectRole(selectedId: string) {
    setRole(selectedId);
    const r = ROLES.find((r) => r.id === selectedId);
    if (r) setEmail(r.email);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Welcome back to ThermaNeXus');
      router.push(getRoleRedirect(result.role));
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      toast.error(error);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background mesh-gradient noise-overlay lg:grid lg:grid-cols-2">
      {/* Left side — branding */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[15%] top-[20%] h-80 w-80 rounded-full bg-primary/25 blur-[110px] animate-mesh-drift" style={{ animationDuration: '18s' }} />
          <div className="absolute right-[20%] top-[40%] h-96 w-96 rounded-full bg-accent/20 blur-[120px] animate-mesh-drift" style={{ animationDuration: '22s', animationDelay: '2s' }} />
          <div className="absolute bottom-[15%] left-[35%] h-72 w-72 rounded-full bg-violet-500/15 blur-[100px] animate-mesh-drift" style={{ animationDuration: '20s', animationDelay: '4s' }} />
        </div>
        <div className="absolute inset-0 -z-10 grid-overlay opacity-40" />
        <FloatingParticles />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-animated shadow-glow transition-transform group-hover:scale-105">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-display text-base font-bold">ThermaNeXus</p>
              <p className="text-[10px] text-muted-foreground">Cold Chain AI</p>
            </div>
          </Link>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-md">
          <motion.h2 variants={fadeInUp} className="font-display text-3xl font-bold tracking-tight text-foreground">Predict Risk.<br />Protect Medicines.<br /><span className="gradient-text-animated">Deliver Safely.</span></motion.h2>
          <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">The AI-powered predictive cold chain rescue platform trusted by national health authorities and global pharmaceutical companies.</motion.p>
          <motion.div variants={staggerContainer} className="mt-6 space-y-3">
            {['94.2% AI prediction accuracy', 'Real-time IoT monitoring', 'Automated emergency rescue', 'HIPAA & GDPR compliant'].map((item) => (
              <motion.div key={item} variants={fadeInUp} className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span className="text-foreground">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs text-muted-foreground">© 2025 ThermaNeXus. All rights reserved.</motion.p>
      </div>

      {/* Right side — form */}
      <div className="relative flex min-h-screen items-center justify-center p-6 lg:min-h-0">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-[10%] top-[15%] h-72 w-72 rounded-full bg-primary/15 blur-[100px] animate-glow-pulse" />
          <div className="absolute bottom-[20%] left-[15%] h-80 w-80 rounded-full bg-accent/12 blur-[110px] animate-mesh-drift" style={{ animationDuration: '24s' }} />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={scaleIn}
          className="w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-animated shadow-glow">
                <Snowflake className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-display text-base font-bold">ThermaNeXus</p>
                <p className="text-[10px] text-muted-foreground">Cold Chain AI</p>
              </div>
            </Link>
          </div>
          <Card className="glass-card gradient-border overflow-hidden">
            <CardHeader>
              <motion.div variants={fadeInUp}>
                <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
                <p className="text-sm text-muted-foreground">Sign in to your ThermaNeXus account</p>
              </motion.div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <motion.div variants={fadeInUp} className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-xl border-border/60 bg-card/50 pl-9 backdrop-blur-sm transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      placeholder="you@organization.ai"
                      required
                    />
                  </div>
                </motion.div>
                <motion.div variants={fadeInUp} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-xl border-border/60 bg-card/50 pl-9 pr-9 backdrop-blur-sm transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={fadeInUp} className="space-y-2">
                  <Label>Select your role</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => selectRole(r.id)}
                        className={cn(
                          'group relative flex items-center gap-2 overflow-hidden rounded-xl border p-3 text-sm transition-all duration-300',
                          role === r.id
                            ? 'border-primary bg-primary/5 text-primary shadow-glow'
                            : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
                        )}
                      >
                        {role === r.id && (
                          <motion.div
                            layoutId={`role-${r.id}`}
                            className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 to-accent/5"
                          />
                        )}
                        <r.icon className={cn('h-4 w-4 transition-transform group-hover:scale-110', role === r.id && 'text-primary')} />
                        <span className="font-medium">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
                <motion.div variants={fadeInUp} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button type="submit" className="w-full gradient-animated text-white gap-2 btn-glow" disabled={loading}>
                    {loading ? (
                      <motion.span className="flex items-center gap-2">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                          <Snowflake className="h-4 w-4" />
                        </motion.div>
                        Signing in...
                      </motion.span>
                    ) : (
                      <>
                        Sign In <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
                <motion.div variants={fadeInUp} className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/80 px-2 text-muted-foreground backdrop-blur-sm">or</span>
                  </div>
                </motion.div>
                <motion.div variants={fadeInUp} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button type="button" variant="outline" className="w-full gap-2 rounded-xl border-border/60 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-muted/50" onClick={handleGoogle} disabled={googleLoading}>
                    {googleLoading ? 'Connecting...' : (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Continue with Google
                      </>
                    )}
                  </Button>
                </motion.div>
                <motion.p variants={fadeInUp} className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account? <Link href="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
                </motion.p>
                <motion.div variants={fadeInUp} className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center text-xs text-muted-foreground backdrop-blur-sm">
                  Demo mode: credentials are pre-filled. Click Sign In to explore the platform.
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
