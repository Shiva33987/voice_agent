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
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Bot,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { PageLayout, PageSection } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
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

export default function AppointmentsPage() {
  const { user, redirectToLogin, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!authLoading && !user) {
      redirectToLogin();
    }
  }, [authLoading, user, redirectToLogin]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/appointments");
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/v1/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Appointment status updated to ${status}`);
        fetchAppointments();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteAppointment = async (id: number, code: string) => {
    if (!window.confirm(`Are you sure you want to delete appointment ${code}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/appointments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Appointment ${code} deleted successfully`);
        fetchAppointments();
      } else {
        toast.error("Failed to delete appointment");
      }
    } catch {
      toast.error("Failed to delete appointment");
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      apt.appointment_code.toLowerCase().includes(search.toLowerCase()) ||
      apt.customer_phone.includes(search) ||
      (apt.customer_email && apt.customer_email.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;

  return (
    <PageLayout
      title="Appointments"
      description="All appointments scheduled across your conversational AI agents and website widgets."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAppointments}
          className="border-slate-800 hover:bg-slate-900 text-xs text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white flex items-center justify-between">
              {appointments.length}
              <CalendarDays className="h-5 w-5 text-blue-500 opacity-60" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Across all live agents</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Confirmed / Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 flex items-center justify-between">
              {confirmedCount}
              <CalendarCheck className="h-5 w-5 text-emerald-500 opacity-60" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Active customer reservations</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Completed Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400 flex items-center justify-between">
              {completedCount}
              <TrendingUp className="h-5 w-5 text-blue-500 opacity-60" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Fulfilled consultations</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by customer, phone, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-950 border-slate-800 text-xs h-9 text-white placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {["all", "confirmed", "completed", "cancelled"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? "default" : "outline"}
              onClick={() => setStatusFilter(st)}
              className={`text-xs h-8 capitalize ${
                statusFilter === st
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <PageSection>
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            Loading appointments...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-16 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <CalendarDays className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-white">No appointments found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When customers book through your agent booking pages or external website widgets, their bookings appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden divide-y divide-slate-800/80">
            {filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-900/60 transition-colors"
              >
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
                    <span className="flex items-center gap-1 text-slate-200 font-medium">
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
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                      {apt.service_type}
                    </span>
                    <Link
                      href={`/workflow/${apt.workflow_id}`}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] hover:underline"
                    >
                      <Bot className="h-3 w-3" />
                      Agent #{apt.workflow_id}
                    </Link>
                  </div>

                  {apt.notes && (
                    <p className="text-xs text-slate-400 italic pt-0.5">
                      &quot;{apt.notes}&quot;
                    </p>
                  )}
                </div>

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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteAppointment(apt.id, apt.appointment_code)}
                    className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    title="Delete appointment"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>
    </PageLayout>
  );
}

