"use client";

import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Code,
  Settings,
  Sparkles,
  CalendarCheck,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Appointment {
  id: number;
  appointment_code: string;
  workflow_id: number;
  workflow_run_id?: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  booking_source: string;
  notes?: string | null;
  created_at?: string;
}

interface AgentAppointmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: number;
  workflowName: string;
  onCountUpdate?: (count: number) => void;
}

export function AgentAppointmentsDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  onCountUpdate,
}: AgentAppointmentsDialogProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  // Config State
  const [pageTitle, setPageTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [serviceTypesStr, setServiceTypesStr] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const publicBookingUrl = typeof window !== "undefined" ? `${window.location.origin}/book/${workflowId}` : `http://localhost:3000/book/${workflowId}`;
  const embedScriptSnippet = `<script\n  src="${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/embed/booking-widget.js"\n  data-agent-id="${workflowId}"\n  data-label="Book with ${workflowName || "AI Agent"}"\n  data-primary-color="#2563eb"\n  data-position="bottom-right">\n</script>`;

  const fetchAppointments = async () => {
    if (!workflowId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/appointments/workflow/${workflowId}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
        if (onCountUpdate) {
          onCountUpdate(data.length);
        }
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    if (!workflowId) return;
    try {
      const res = await fetch(`/api/v1/appointments/public-config/${workflowId}`);
      if (res.ok) {
        const cfg = await res.json();
        setPageTitle(cfg.page_title || `${workflowName} Booking`);
        setWelcomeMessage(cfg.welcome_message || "");
        setServiceTypesStr((cfg.service_types || []).join(", "));
      }
    } catch (err) {
      console.error("Failed to load booking config:", err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAppointments();
      fetchConfig();
    }
  }, [open, workflowId]);

  const handleUpdateStatus = async (appointmentId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Appointment status updated to ${newStatus}`);
        fetchAppointments();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("Network error updating status");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      const serviceTypes = serviceTypesStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/v1/appointments/config/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_title: pageTitle,
          welcome_message: welcomeMessage,
          service_types: serviceTypes,
        }),
      });

      if (res.ok) {
        toast.success("Agent booking configuration saved!");
      } else {
        toast.error("Failed to save booking configuration");
      }
    } catch (err) {
      toast.error("Failed to save booking configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const copyToClipboard = (text: string, type: "link" | "embed") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success("Booking URL copied to clipboard!");
    } else {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
      toast.success("Embed script copied to clipboard!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-slate-950 border-slate-800 text-slate-100 p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Agent Appointments
                  <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/10 font-mono text-xs">
                    {appointments.length} Total
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Manage bookings, public booking pages, and multi-website embed snippets for <strong>{workflowName}</strong>.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointments}
              className="border-slate-800 hover:bg-slate-900 text-xs text-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-slate-900 border border-slate-800 p-1">
              <TabsTrigger value="list" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                Booked Appointments ({appointments.length})
              </TabsTrigger>
              <TabsTrigger value="embed" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Code className="h-3.5 w-3.5 mr-1.5" />
                Multi-Website Embed
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Booking Page Settings
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Booked Appointments Table */}
            <TabsContent value="list" className="space-y-3">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  Loading agent appointments...
                </div>
              ) : appointments.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">No appointments booked yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Share this agent&apos;s booking link or embed the widget on your website to start receiving appointments.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveTab("embed")}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs mt-2"
                  >
                    View Embed Code & Link
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden divide-y divide-slate-800/80">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-900/80 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                            {apt.appointment_code}
                          </span>
                          <span className="font-semibold text-sm text-white">{apt.customer_name}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold tracking-wider ${
                              apt.status === "confirmed"
                                ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                                : apt.status === "completed"
                                ? "border-blue-500/40 text-blue-400 bg-blue-500/10"
                                : "border-rose-500/40 text-rose-400 bg-rose-500/10"
                            }`}
                          >
                            {apt.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-slate-300 font-medium">
                            <Clock className="h-3.5 w-3.5 text-blue-400" />
                            {apt.appointment_date} at {apt.appointment_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-500" />
                            {apt.customer_phone}
                          </span>
                          {apt.customer_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-500" />
                              {apt.customer_email}
                            </span>
                          )}
                          <span className="bg-slate-800/80 px-2 py-0.5 rounded text-[11px] text-slate-300">
                            {apt.service_type}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            via {apt.booking_source === "voice_call" ? "Voice AI 🎙️" : "Web Embed 🌐"}
                          </span>
                        </div>

                        {apt.notes && (
                          <p className="text-xs text-slate-400 italic pt-0.5">
                            &quot;{apt.notes}&quot;
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {apt.status === "confirmed" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(apt.id, "completed")}
                              className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(apt.id, "cancelled")}
                              className="h-8 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Embed on Multiple Websites */}
            <TabsContent value="embed" className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-blue-400" />
                    Agent Dedicated Booking URL
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Every AI agent has its own shareable link to send directly to clients or embed inside iframes.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={publicBookingUrl}
                    className="bg-slate-950 font-mono text-xs border-slate-800 text-blue-400 h-9"
                  />
                  <Button
                    onClick={() => copyToClipboard(publicBookingUrl, "link")}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {copiedLink ? "Copied" : "Copy Link"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(publicBookingUrl, "_blank")}
                    className="border-slate-800 hover:bg-slate-800 text-slate-300 text-xs h-9"
                  >
                    Open
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Code className="h-4 w-4 text-emerald-400" />
                      Embed on Any Website (HTML Widget)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Paste this script before the &lt;/body&gt; tag on WordPress, Webflow, Shopify, or custom websites.
                    </p>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(embedScriptSnippet, "embed")}
                    size="sm"
                    variant="outline"
                    className="border-slate-800 hover:bg-slate-800 text-xs text-slate-200"
                  >
                    {copiedEmbed ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {copiedEmbed ? "Copied Snippet" : "Copy Script"}
                  </Button>
                </div>

                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto">
                  {embedScriptSnippet}
                </pre>
              </div>
            </TabsContent>

            {/* Tab 3: Booking Page Settings */}
            <TabsContent value="settings">
              <form onSubmit={handleSaveConfig} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Booking Page Headline</Label>
                  <Input
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                    placeholder="e.g. Dental Care Appointment Booking"
                    className="bg-slate-950 border-slate-800 text-xs h-9 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Welcome Message</Label>
                  <Textarea
                    rows={2}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Describe what visitors can expect when booking..."
                    className="bg-slate-950 border-slate-800 text-xs text-white resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Available Services (comma-separated)</Label>
                  <Input
                    value={serviceTypesStr}
                    onChange={(e) => setServiceTypesStr(e.target.value)}
                    placeholder="General Consultation, Product Demo, Follow-up"
                    className="bg-slate-950 border-slate-800 text-xs h-9 text-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingConfig}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 font-medium"
                >
                  {savingConfig ? "Saving Settings..." : "Save Booking Settings"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

