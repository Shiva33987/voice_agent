"use client";

import React, { useEffect, useState, use } from "react";
import {
  CalendarDays,
  Clock,
  Phone,
  User,
  Mail,
  CheckCircle2,
  Sparkles,
  Bot,
  AlertCircle,
  Calendar as CalendarIcon,
  Mic,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BookingConfig {
  workflow_id: number;
  page_title: string;
  page_slug: string;
  accent_color: string;
  welcome_message: string;
  service_types: string[];
  business_hours: {
    days?: string[];
    start_time?: string;
    end_time?: string;
    slot_duration?: number;
  };
  voice_agent_enabled: boolean;
  allow_guest_booking: boolean;
}

interface AvailabilityData {
  date: string;
  workflow_id: number;
  total_slots: number;
  available_slots: string[];
  booked_slots: string[];
  service_types: string[];
}

export default function AgentBookingPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const unwrappedParams = use(params);
  const workflowId = parseInt(unwrappedParams.workflowId, 10);

  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Date selection (default today in YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Slot & Form state
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState<{
    appointment_code: string;
    appointment_date: string;
    appointment_time: string;
    customer_name: string;
    service_type: string;
  } | null>(null);

  // Voice Mode
  const [voiceCallActive, setVoiceCallActive] = useState(false);

  // Fetch agent booking configuration
  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoadingConfig(true);
        const res = await fetch(`/api/v1/appointments/public-config/${workflowId}`);
        if (!res.ok) throw new Error("Failed to load booking configuration");
        const data = await res.json();
        setConfig(data);
        if (data.service_types && data.service_types.length > 0) {
          setSelectedService(data.service_types[0]);
        }
      } catch (err: any) {
        console.error("Config fetch error:", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    if (workflowId) {
      fetchConfig();
    }
  }, [workflowId]);

  // Fetch slot availability when date or agent changes
  useEffect(() => {
    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        const res = await fetch(
          `/api/v1/appointments/availability?workflow_id=${workflowId}&date=${selectedDate}`
        );
        if (!res.ok) throw new Error("Failed to load available slots");
        const data = await res.json();
        setAvailability(data);
      } catch (err: any) {
        console.error("Slots fetch error:", err);
      } finally {
        setLoadingSlots(false);
      }
    }
    if (workflowId && selectedDate) {
      fetchSlots();
    }
  }, [workflowId, selectedDate]);

  // Generate 7 upcoming day chips
  const getUpcomingDays = () => {
    const days = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      days.push({ iso, weekday, dayNum });
    }
    return days;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error("Please select a time slot.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Please provide both name and phone number.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/v1/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflowId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || undefined,
          appointment_date: selectedDate,
          appointment_time: selectedSlot,
          service_type: selectedService || "General Consultation",
          notes: notes || undefined,
          booking_source: "direct_page",
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || "Failed to confirm appointment");
      }

      setConfirmedBooking({
        appointment_code: result.appointment_code,
        appointment_date: result.appointment_date,
        appointment_time: result.appointment_time,
        customer_name: result.customer_name,
        service_type: result.service_type,
      });
      toast.success(result.message || "Appointment successfully confirmed!");
    } catch (err: any) {
      toast.error(err.message || "Could not book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadICS = () => {
    if (!confirmedBooking) return;
    const { appointment_code, appointment_date, appointment_time, service_type } = confirmedBooking;
    const startIso = `${appointment_date.replace(/-/g, "")}T${appointment_time.replace(":", "")}00`;
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dograh Voice AI//Booking Calendar//EN
BEGIN:VEVENT
UID:${appointment_code}@dograh.ai
SUMMARY:${service_type} (Dograh AI)
DESCRIPTION:Appointment confirmed with code ${appointment_code}.
DTSTART:${startIso}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${appointment_code}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading Agent Booking Portal...</p>
        </div>
      </div>
    );
  }

  const agentTitle = config?.page_title || `AI Agent #${workflowId}`;
  const accentColor = config?.accent_color || "#3b82f6";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
              {agentTitle}
              <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                Live Agent
              </Badge>
            </h1>
            <p className="text-xs text-slate-400">Powered by Dograh Conversational Voice AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs hidden sm:flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Verified Calendar Integration
          </Badge>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {confirmedBooking ? (
          /* Confirmation Success Card */
          <Card className="border-emerald-500/30 bg-slate-900/90 shadow-2xl backdrop-blur overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />
            <CardHeader className="text-center pt-8 pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Appointment Confirmed!</CardTitle>
              <CardDescription className="text-slate-400 text-sm mt-1">
                Your appointment has been registered with our AI agent.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 max-w-md mx-auto">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Appointment Code</span>
                  <span className="font-mono font-bold text-blue-400 text-base">
                    {confirmedBooking.appointment_code}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Customer</span>
                  <span className="font-medium text-white">{confirmedBooking.customer_name}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Service</span>
                  <span className="font-medium text-white">{confirmedBooking.service_type}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Date & Time</span>
                  <span className="font-semibold text-emerald-400">
                    {confirmedBooking.appointment_date} at {confirmedBooking.appointment_time}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={downloadICS} variant="outline" className="flex-1 border-slate-700 hover:bg-slate-800">
                  <CalendarDays className="h-4 w-4 mr-2 text-blue-400" />
                  Add to Calendar (.ics)
                </Button>
                <Button
                  onClick={() => {
                    setConfirmedBooking(null);
                    setSelectedSlot(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Book Another Slot
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Agent Intro & Voice Trigger */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    Dedicated Booking Assistant
                  </div>
                  <CardTitle className="text-xl font-bold text-white mt-1">{agentTitle}</CardTitle>
                  <CardDescription className="text-slate-400 text-sm leading-relaxed mt-2">
                    {config?.welcome_message ||
                      "Pick an available time slot below to schedule your appointment, or talk with the agent live over voice."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-2">
                  {/* Talk to AI Voice Agent Trigger Card */}
                  <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900/40 to-slate-900/40 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                          <Mic className="h-4 w-4 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">Prefer to talk?</h4>
                          <p className="text-xs text-slate-400">Book in 60 seconds with Voice AI</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
                        AI Voice
                      </Badge>
                    </div>

                    <Button
                      onClick={() => setVoiceCallActive(!voiceCallActive)}
                      variant={voiceCallActive ? "destructive" : "default"}
                      className={`w-full text-xs font-medium ${
                        voiceCallActive ? "" : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {voiceCallActive ? "End Voice Call" : "🎙️ Talk with Agent to Book"}
                    </Button>

                    {voiceCallActive && (
                      <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2 text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Live Voice AI Session Active
                        </div>
                        <p className="text-slate-400">
                          Say: <em>&quot;I&apos;d like to book an appointment for tomorrow afternoon.&quot;</em> The agent will automatically check slots and confirm your booking.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Service Types */}
                  {config?.service_types && config.service_types.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-300">Available Services</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {config.service_types.map((st) => (
                          <Badge
                            key={st}
                            variant={selectedService === st ? "default" : "outline"}
                            onClick={() => setSelectedService(st)}
                            className={`cursor-pointer text-xs transition-colors ${
                              selectedService === st
                                ? "bg-blue-600 text-white hover:bg-blue-500 border-transparent"
                                : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                            }`}
                          >
                            {st}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Date & Slot Picker + Intake Form */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-blue-400" />
                    Select Date & Time Slot
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Appointments automatically lock in real-time once confirmed.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* 7-Day Quick Date Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-slate-300">Choose Date</Label>
                      <span className="text-slate-400 font-mono text-[11px]">{selectedDate}</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {getUpcomingDays().map((d) => (
                        <button
                          key={d.iso}
                          type="button"
                          onClick={() => setSelectedDate(d.iso)}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs border transition-all ${
                            selectedDate === d.iso
                              ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 font-semibold"
                              : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-wide opacity-80">{d.weekday}</span>
                          <span className="text-xs font-bold mt-0.5">{d.dayNum}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Available Time Slots */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-slate-300">Available Time Slots</Label>
                      {availability && (
                        <span className="text-xs text-slate-400">
                          {availability.available_slots.length} open slot(s)
                        </span>
                      )}
                    </div>

                    {loadingSlots ? (
                      <div className="py-8 flex justify-center items-center text-slate-500 text-xs">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                        Checking calendar slots...
                      </div>
                    ) : availability && availability.available_slots.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                        {availability.available_slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                              selectedSlot === slot
                                ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold"
                                : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                            }`}
                          >
                            <Clock className="w-3 h-3 inline mr-1 opacity-70" />
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                        <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                        No available slots for this date. Please pick another day.
                      </div>
                    )}
                  </div>

                  {/* Customer Intake Form */}
                  <form onSubmit={handleBookingSubmit} className="space-y-4 pt-2 border-t border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <Input
                            required
                            placeholder="e.g. John Doe"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="pl-9 bg-slate-950/70 border-slate-800 text-xs h-9 text-white placeholder:text-slate-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Phone Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <Input
                            required
                            type="tel"
                            placeholder="e.g. +1 555-0192"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="pl-9 bg-slate-950/70 border-slate-800 text-xs h-9 text-white placeholder:text-slate-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Email Address (Optional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="pl-9 bg-slate-950/70 border-slate-800 text-xs h-9 text-white placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Notes or Requests (Optional)</Label>
                      <Textarea
                        rows={2}
                        placeholder="Tell the agent what you would like to discuss..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-slate-950/70 border-slate-800 text-xs text-white placeholder:text-slate-600 resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting || !selectedSlot}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs h-10 shadow-lg shadow-blue-500/20"
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Confirming Appointment...
                        </div>
                      ) : (
                        `Confirm Booking ${selectedSlot ? `for ${selectedSlot}` : ""}`
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        <p>Dograh AI Agent Booking Gateway • Multi-Website Telephony & Conversational Platform</p>
      </footer>
    </div>
  );
}

