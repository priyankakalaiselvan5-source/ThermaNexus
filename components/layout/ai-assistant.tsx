'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bot, X, Send, Sparkles, Brain, RotateCcw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  typing?: boolean;
}

const SUGGESTIONS = [
  'Show critical shipments',
  'Which shipment has the highest risk?',
  'Show delayed deliveries',
  'Recommend the safest route',
];

const RESPONSES: Record<string, string> = {
  'critical shipments': 'There are currently 2 critical shipments requiring immediate attention:\n\n1. TNX-SHP-2025-003 (Oxford-AstraZeneca Vaccine) — Temperature at 9.2°C, exceeding the 2–8°C safe range. Emergency rescue protocol activated.\n\n2. TNX-SHP-2025-011 (Bevacizumab) — Risk score at 68 with cooling efficiency degrading. Recommend proactive rerouting to nearby cold storage.',
  'highest risk': 'The shipment with the highest risk is TNX-SHP-2025-003:\n\n• Medicine: Oxford-AstraZeneca Vaccine\n• Risk Score: 82/100 (Critical)\n• Temperature: 9.2°C (safe range: 2–8°C)\n• Cooling Efficiency: 42% — dangerously low\n• Estimated safe time remaining: 2.4 hours\n• AI Recommendation: Divert to Delhi Ultra Cold Bank immediately.',
  'delayed deliveries': 'There are currently 3 delayed deliveries:\n\n1. TNX-SHP-2025-007 (Insulin Glargine) — Delayed by 2h 15min due to highway traffic on NH28.\n\n2. TNX-SHP-2025-012 (MMR Vaccine) — Delayed by 4h due to weather conditions in Maharashtra.\n\n3. TNX-SHP-2025-015 (Blood Products) — Delayed by 1h 40min due to vehicle breakdown near Nagpur.\n\nAI has already notified receiving hospitals.',
  'safest route': 'Recommended safest route for active critical shipments:\n\n• For TNX-SHP-2025-003: Take NH44 via Mathura Bypass → avoid NH28 (flooding reported). ETA: 1h 48min. Risk reduced from Critical → Moderate.\n\n• For TNX-SHP-2025-007: Divert via SH57 → Agra Expressway. Traffic-free, ETA 45min faster.\n\nAI confidence: 96%. All hospitals along route have been pre-notified.',
  'ai prediction': 'Latest AI prediction (Model v2.1):\n\n• Overall fleet health: 72% (–4% vs last hour)\n• 2 high-risk shipments detected\n• Prediction accuracy: 94.2%\n• Cooling failure predicted for TNX-SHP-2025-003 within 4 hours\n• 1,247 telemetry points analyzed in the last 24 hours.',
  'cold storage': 'Nearest cold storage facilities:\n\n1. Delhi Ultra Cold Bank — 18km, 60% capacity, WHO-GMP certified\n2. Mumbai Subzero Reserve — 22km, 35% capacity available\n3. Bengaluru Cryo Vault — 15km, 75% capacity available',
  default: 'I\'m your ThermaNeXus AI assistant. I can help you with:\n\n• Real-time shipment status and tracking\n• AI prediction explanations and insights\n• Emergency rescue recommendations\n• Finding nearby cold storage or hospitals\n• Generating reports and analytics\n• Route optimization suggestions\n\nHow can I assist you with your cold chain operations?',
};

function getResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('critical') && q.includes('shipment')) return RESPONSES['critical shipments'];
  if (q.includes('highest risk') || q.includes('most risk')) return RESPONSES['highest risk'];
  if (q.includes('delayed') || q.includes('delay')) return RESPONSES['delayed deliveries'];
  if (q.includes('safest route') || q.includes('safe route') || q.includes('recommend') && q.includes('route')) return RESPONSES['safest route'];
  if (q.includes('prediction') || q.includes('ai')) return RESPONSES['ai prediction'];
  if (q.includes('cold storage')) return RESPONSES['cold storage'];
  return RESPONSES.default;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: RESPONSES.default },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  function send(text?: string) {
    const query = (text || input).trim();
    if (!query || isTyping) return;
    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setInput('');
    setIsTyping(true);

    const delay = 800 + Math.random() * 600;
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'assistant', content: getResponse(query) }]);
    }, delay);
  }

  function clearChat() {
    setMessages([{ role: 'assistant', content: RESPONSES.default }]);
    setIsTyping(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl shadow-premium-lg transition-all hover:scale-105',
          open ? 'bg-card text-foreground border border-border' : 'gradient-primary text-white shadow-glow'
        )}
        title="AI Assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success ring-2 ring-card" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] max-h-[75vh] w-[390px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-border bg-card shadow-premium-lg animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">ThermaNeXus AI</p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <p className="text-[10px] text-muted-foreground">Online · Model v2.1</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Clear chat"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full gradient-primary">
                    <Brain className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line leading-relaxed',
                  msg.role === 'user'
                    ? 'gradient-primary text-white rounded-br-md'
                    : 'bg-secondary text-foreground rounded-bl-md'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={endRef} />
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-1.5 border-t border-border/50 px-3 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={isTyping}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about shipments, routes..."
                disabled={isTyping}
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <button
                onClick={() => send()}
                disabled={isTyping || !input.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white transition-transform hover:scale-105 disabled:opacity-40 disabled:scale-100"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
