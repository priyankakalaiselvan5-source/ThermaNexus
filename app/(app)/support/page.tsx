'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  LifeBuoy, Mail, Phone, MessageSquare, Search, BookOpen,
  MapPin, AlertTriangle, Clock, CheckCircle2, Send, HelpCircle,
} from 'lucide-react';

const FAQS = [
  { q: 'How do I activate an emergency rescue protocol?', a: 'Navigate to the Emergency Rescue Center, select the affected shipment, and click "Trigger SOS". The system will automatically locate the nearest cold storage, notify the hospital, and generate a rescue route.' },
  { q: 'How accurate are the AI predictions?', a: 'Our Gemini-powered AI models achieve 94.2% accuracy on spoilage risk and 91% on cooling failure prediction, validated against millions of real-world shipment data points.' },
  { q: 'Can I export reports in different formats?', a: 'Yes. Go to the Reports page, select your report type, choose a date range, and select PDF, Excel, or CSV format before generating.' },
  { q: 'How do I add a new vehicle to the fleet?', a: 'Navigate to the Fleet page and click "Add Vehicle". Fill in the registration number, make, model, cooling system type, and sensor capabilities.' },
  { q: 'What languages are supported?', a: 'ThermaNeXus supports 11 Indian languages: English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Bengali, and Odia.' },
  { q: 'How do voice commands work?', a: 'Click the microphone icon in the header and speak commands like "Open Dashboard", "Track Shipment", or "Generate Report". The system uses browser speech recognition.' },
];

const TICKETS = [
  { id: 'TK-001', subject: 'GPS signal intermittent on TN01SC9012', status: 'open', priority: 'high', date: '2h ago' },
  { id: 'TK-002', subject: 'Request: Add custom report type', status: 'in_progress', priority: 'medium', date: '1d ago' },
  { id: 'TK-003', subject: 'API key rotation for Gemini', status: 'resolved', priority: 'low', date: '3d ago' },
];

const CONTACTS = [
  { type: '24/7 Emergency Hotline', value: '+91 1800 123 4567', icon: AlertTriangle, color: 'text-critical' },
  { type: 'General Support', value: 'support@thermanexus.ai', icon: Mail, color: 'text-primary' },
  { type: 'Phone Support', value: '+91 80 4567 8900', icon: Phone, color: 'text-accent' },
];

const OFFICES = [
  { city: 'Bengaluru', address: 'Tech Park, Whitefield', state: 'Karnataka' },
  { city: 'Mumbai', address: 'BKC, Bandra East', state: 'Maharashtra' },
  { city: 'New Delhi', address: 'Connaught Place', state: 'Delhi' },
];

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Center"
        description="Get help, view tickets, and contact us"
        icon={LifeBuoy}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {CONTACTS.map(c => (
          <Card key={c.type}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50">
                  <c.icon className={cn('h-5 w-5', c.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{c.type}</p>
                  <p className="text-sm font-semibold text-foreground">{c.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Support Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <p className="text-sm font-semibold text-foreground">Ticket submitted!</p>
                <p className="text-xs text-muted-foreground">Our team will respond within 4 hours.</p>
                <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setSubject(''); }}>Create another</Button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description of issue" required />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Provide detailed information about your issue..." rows={4} required />
                </div>
                <Button type="submit" className="w-full gradient-primary text-white gap-2">
                  <Send className="h-4 w-4" /> Submit Ticket
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TICKETS.map(t => (
              <div key={t.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{t.subject}</p>
                  <Badge variant="outline" className={
                    t.status === 'resolved' ? 'text-success' :
                    t.status === 'in_progress' ? 'text-warning' : 'text-primary'
                  }>
                    {t.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t.id}</span>
                  <span>·</span>
                  <span className="capitalize">{t.priority} priority</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.date}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> Knowledge Base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="rounded-xl border border-border px-4">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Office Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {OFFICES.map(o => (
              <div key={o.city} className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-foreground">{o.city}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{o.address}</p>
                <p className="text-xs text-muted-foreground">{o.state}, India</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { cn } from '@/lib/utils';
