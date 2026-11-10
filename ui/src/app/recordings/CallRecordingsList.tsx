"use client";

import {
    Activity,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FastForward,
    Filter,
    Mic,
    Music,
    Pause,
    Phone,
    PhoneCall,
    Play,
    RefreshCw,
    Search,
    Volume2,
    X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
    getSignedUrlApiV1S3SignedUrlGet,
    getUsageHistoryApiV1OrganizationsUsageRunsGet,
} from "@/client/sdk.gen";
import type { WorkflowRunUsageResponse } from "@/client/types.gen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
import { formatDateTime } from "@/lib/dateTime";

function formatSeconds(secs?: number | null): string {
    if (!secs || secs <= 0) return "00:00";
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatRelativeTime(dateString: string): string {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    } catch {
        return dateString;
    }
}

export default function CallRecordingsList({ refreshKey }: { refreshKey?: number }) {
    const timezone = useOrganizationTimezone();
    const [runs, setRuns] = useState<WorkflowRunUsageResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<"all" | "audio-only" | "inbound" | "outbound">("all");

    // Audio Playback State
    const [playingRunId, setPlayingRunId] = useState<number | null>(null);
    const [audioProgress, setAudioProgress] = useState(0); // 0 to 100
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [audioLoadingRunId, setAudioLoadingRunId] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Transcript Modal State
    const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
    const [selectedRunForTranscript, setSelectedRunForTranscript] = useState<WorkflowRunUsageResponse | null>(null);
    const [transcriptContent, setTranscriptContent] = useState<string | null>(null);
    const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);

    // Fetch Runs
    const fetchRuns = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await getUsageHistoryApiV1OrganizationsUsageRunsGet({
                query: { limit: 100 },
            });

            if (response.data?.runs) {
                setRuns(response.data.runs);
            }
        } catch (err) {
            toast.error("Failed to load call recordings");
            console.error("Error fetching call recordings:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRuns();
    }, [fetchRuns, refreshKey]);

    // Handle Audio Stop / Cleanup
    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setPlayingRunId(null);
        setAudioProgress(0);
        setCurrentTime(0);
    }, []);

    // Toggle Play / Pause for a Run
    const handleTogglePlay = async (run: WorkflowRunUsageResponse) => {
        if (playingRunId === run.id) {
            if (audioRef.current) {
                if (audioRef.current.paused) {
                    await audioRef.current.play();
                } else {
                    audioRef.current.pause();
                }
            }
            return;
        }

        // Stop current playback
        stopAudio();
        setAudioLoadingRunId(run.id);

        try {
            let audioUrl: string | null = null;

            // 1. If backend gave a recording_url (e.g. recordings/126.wav), fetch signed URL
            if (run.recording_url) {
                const signedRes = await getSignedUrlApiV1S3SignedUrlGet({
                    query: { key: run.recording_url },
                });
                if (signedRes.data?.url) {
                    audioUrl = signedRes.data.url;
                }
            }

            // 2. Fallback to public redirect URL or direct URL
            if (!audioUrl) {
                audioUrl = run.recording_public_url ? `${run.recording_public_url}?inline=true` : null;
            }

            if (!audioUrl) {
                toast.error("No audio file available for this call.");
                setAudioLoadingRunId(null);
                return;
            }

            const audio = new Audio(audioUrl);
            audio.playbackRate = playbackRate;

            audio.onloadedmetadata = () => {
                setDuration(audio.duration || run.call_duration_seconds || 0);
            };

            audio.ontimeupdate = () => {
                if (audio.duration) {
                    setCurrentTime(audio.currentTime);
                    setAudioProgress((audio.currentTime / audio.duration) * 100);
                }
            };

            audio.onended = () => {
                stopAudio();
            };

            audio.onerror = () => {
                toast.error("Failed to stream audio file.");
                stopAudio();
            };

            audioRef.current = audio;
            setPlayingRunId(run.id);
            await audio.play();
        } catch (err) {
            console.error("Error playing call audio:", err);
            toast.error("Could not play audio recording.");
            stopAudio();
        } finally {
            setAudioLoadingRunId(null);
        }
    };

    // Cycle Playback Rate: 1x -> 1.25x -> 1.5x -> 2x
    const handleCycleSpeed = () => {
        const speeds = [1, 1.25, 1.5, 2];
        const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
        const newSpeed = speeds[nextIdx];
        setPlaybackRate(newSpeed);
        if (audioRef.current) {
            audioRef.current.playbackRate = newSpeed;
        }
    };

    // Seek in Audio
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newProgress = Number(e.target.value);
        if (audioRef.current && audioRef.current.duration) {
            const newTime = (newProgress / 100) * audioRef.current.duration;
            audioRef.current.currentTime = newTime;
            setAudioProgress(newProgress);
            setCurrentTime(newTime);
        }
    };

    // Download Recording
    const handleDownload = async (run: WorkflowRunUsageResponse) => {
        try {
            let downloadUrl: string | null = null;
            if (run.recording_url) {
                const res = await getSignedUrlApiV1S3SignedUrlGet({
                    query: { key: run.recording_url },
                });
                downloadUrl = res.data?.url || null;
            }
            if (!downloadUrl && run.recording_public_url) {
                downloadUrl = run.recording_public_url;
            }

            if (!downloadUrl) {
                toast.error("Recording download link not available.");
                return;
            }

            const anchor = document.createElement("a");
            anchor.href = downloadUrl;
            anchor.download = `call-recording-${run.id}.wav`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            toast.success(`Downloading recording for Call #${run.id}`);
        } catch (err) {
            console.error("Download failed:", err);
            toast.error("Failed to download recording.");
        }
    };

    // Open Transcript Dialog
    const handleOpenTranscript = async (run: WorkflowRunUsageResponse) => {
        setSelectedRunForTranscript(run);
        setTranscriptModalOpen(true);
        setIsTranscriptLoading(true);
        setTranscriptContent(null);

        try {
            let transcriptText: string | null = null;
            if (run.transcript_url) {
                const res = await getSignedUrlApiV1S3SignedUrlGet({
                    query: { key: run.transcript_url },
                });
                if (res.data?.url) {
                    const fetchRes = await fetch(res.data.url);
                    if (fetchRes.ok) {
                        transcriptText = await fetchRes.text();
                    }
                }
            } else if (run.transcript_public_url) {
                const fetchRes = await fetch(run.transcript_public_url);
                if (fetchRes.ok) {
                    transcriptText = await fetchRes.text();
                }
            }

            setTranscriptContent(transcriptText || "No transcript recorded for this session.");
        } catch {
            setTranscriptContent("Failed to load transcript data.");
        } finally {
            setIsTranscriptLoading(false);
        }
    };

    // Selection & Delete Logic
    const [selectedRunIds, setSelectedRunIds] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const getAuthHeaders = async () => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        try {
            const r = await fetch("/api/auth/oss");
            if (r.ok) {
                const d = await r.json();
                if (d?.token) h["Authorization"] = `Bearer ${d.token}`;
            }
        } catch (_) {}
        return h;
    };

    const handleDeleteSingle = async (runId: number, runName?: string) => {
        if (!confirm(`Are you sure you want to permanently delete Call #${runId} (${runName || "Call Recording"})? This action cannot be undone.`)) return;
        setIsDeleting(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/v1/organizations/usage/runs/${runId}`, {
                method: "DELETE",
                headers,
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.detail || "Failed to delete call recording");
            }
            setRuns((prev) => prev.filter((r) => r.id !== runId));
            setSelectedRunIds((prev) => prev.filter((id) => id !== runId));
            toast.success(`Call #${runId} deleted successfully.`);
        } catch (err: any) {
            toast.error(err.message || "Failed to delete call recording");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (!selectedRunIds.length) return;
        if (!confirm(`Are you sure you want to permanently delete ${selectedRunIds.length} selected call recording(s)? This action cannot be undone.`)) return;
        setIsDeleting(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch("/api/v1/organizations/usage/runs", {
                method: "DELETE",
                headers,
                body: JSON.stringify({ run_ids: selectedRunIds, delete_all: false }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.detail || "Failed to delete selected call recordings");
            }
            const count = selectedRunIds.length;
            setRuns((prev) => prev.filter((r) => !selectedRunIds.includes(r.id)));
            setSelectedRunIds([]);
            toast.success(`${count} call recording(s) deleted successfully.`);
        } catch (err: any) {
            toast.error(err.message || "Failed to delete call recordings");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!runs.length) return;
        if (!confirm(`WARNING: Are you sure you want to permanently delete ALL ${runs.length} call recordings? This action CANNOT be undone and will permanently erase all calls and audio.`)) return;
        const typed = prompt(`Please type DELETE to confirm deleting all ${runs.length} call recordings:`);
        if (typed !== "DELETE") {
            toast.info("Delete all cancelled.");
            return;
        }
        setIsDeleting(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch("/api/v1/organizations/usage/runs", {
                method: "DELETE",
                headers,
                body: JSON.stringify({ delete_all: true }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.detail || "Failed to delete all recordings");
            }
            setRuns([]);
            setSelectedRunIds([]);
            toast.success("All call recordings have been permanently deleted.");
        } catch (err: any) {
            toast.error(err.message || "Failed to delete recordings");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleSelect = (id: number) => {
        setSelectedRunIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    // Filter & Search Logic
    const filteredRuns = useMemo(() => {
        return runs.filter((run) => {
            const hasAudio = Boolean(run.recording_url || run.recording_public_url);

            if (activeFilter === "audio-only" && !hasAudio) return false;
            if (activeFilter === "inbound" && run.call_type?.toLowerCase() !== "inbound" && !run.workflow_name?.toLowerCase().includes("inbound")) {
                if (run.called_number && !run.caller_number) return false;
            }
            if (activeFilter === "outbound" && run.call_type?.toLowerCase() !== "outbound" && !run.workflow_name?.toLowerCase().includes("outbound")) {
                if (run.caller_number && !run.called_number) return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const idMatch = run.id.toString().includes(q);
                const nameMatch = (run.workflow_name || run.name || "").toLowerCase().includes(q);
                const callerMatch = (run.caller_number || "").toLowerCase().includes(q);
                const calledMatch = (run.called_number || "").toLowerCase().includes(q);
                return idMatch || nameMatch || callerMatch || calledMatch;
            }

            return true;
        });
    }, [runs, activeFilter, searchQuery]);

    // Metrics
    const totalRecordedWithAudio = useMemo(() => {
        return runs.filter((r) => r.recording_url || r.recording_public_url).length;
    }, [runs]);

    const totalDurationWithAudio = useMemo(() => {
        return runs
            .filter((r) => r.recording_url || r.recording_public_url)
            .reduce((acc, r) => acc + (r.call_duration_seconds || 0), 0);
    }, [runs]);

    return (
        <div className="space-y-6">
            {/* Top Metric Cards with Glassmorphism */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card relative overflow-hidden rounded-2xl p-5 border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-lg transition-all hover:border-indigo-500/40 hover:shadow-indigo-500/10">
                    <div className="absolute top-0 right-0 -mt-3 -mr-3 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/0 blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                            <Mic className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Audio Recordings</p>
                            <h3 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                                {isLoading ? <Skeleton className="h-7 w-16" /> : `${totalRecordedWithAudio} Calls`}
                            </h3>
                        </div>
                    </div>
                    <p className="text-xs text-indigo-300/80 mt-3 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Stored in private MinIO voice bucket
                    </p>
                </div>

                <div className="glass-card relative overflow-hidden rounded-2xl p-5 border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-lg transition-all hover:border-cyan-500/40 hover:shadow-cyan-500/10">
                    <div className="absolute top-0 right-0 -mt-3 -mr-3 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/0 blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-cyan-400 border border-cyan-500/30">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Airtime</p>
                            <h3 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                                {isLoading ? <Skeleton className="h-7 w-20" /> : formatSeconds(totalDurationWithAudio)}
                            </h3>
                        </div>
                    </div>
                    <p className="text-xs text-cyan-300/80 mt-3 flex items-center gap-1.5 font-medium">
                        <Activity className="h-3.5 w-3.5 text-cyan-400" />
                        High-fidelity audio stream captures
                    </p>
                </div>

                <div className="glass-card relative overflow-hidden rounded-2xl p-5 border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-lg transition-all hover:border-fuchsia-500/40 hover:shadow-fuchsia-500/10">
                    <div className="absolute top-0 right-0 -mt-3 -mr-3 h-24 w-24 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-rose-500/0 blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-fuchsia-500/20 to-rose-500/20 flex items-center justify-center text-fuchsia-400 border border-fuchsia-500/30">
                            <PhoneCall className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Runs Tracked</p>
                            <h3 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                                {isLoading ? <Skeleton className="h-7 w-14" /> : `${runs.length} Calls`}
                            </h3>
                        </div>
                    </div>
                    <p className="text-xs text-fuchsia-300/80 mt-3 flex items-center gap-1.5 font-medium">
                        <Volume2 className="h-3.5 w-3.5 text-fuchsia-400" />
                        Auto-recorded inbound & outbound
                    </p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search by phone number, agent name, or call ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 bg-white/[0.02] border-white/10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl placeholder:text-muted-foreground/60"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                        onClick={() => setActiveFilter("audio-only")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeFilter === "audio-only"
                                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/40"
                                : "text-muted-foreground hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5"
                        }`}
                    >
                        <Volume2 className="h-3.5 w-3.5" />
                        With Audio Only ({totalRecordedWithAudio})
                    </button>

                    <button
                        onClick={() => setActiveFilter("all")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeFilter === "all"
                                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/40"
                                : "text-muted-foreground hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5"
                        }`}
                    >
                        All Calls ({runs.length})
                    </button>

                    <button
                        onClick={() => setActiveFilter("inbound")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeFilter === "inbound"
                                ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/25 border border-teal-400/40"
                                : "text-muted-foreground hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5"
                        }`}
                    >
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        Inbound
                    </button>

                    <button
                        onClick={() => setActiveFilter("outbound")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeFilter === "outbound"
                                ? "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md shadow-purple-500/25 border border-violet-400/40"
                                : "text-muted-foreground hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5"
                        }`}
                    >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Outbound
                    </button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchRuns}
                        className="h-9 w-9 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white"
                        title="Refresh call list"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.035] border border-white/10 backdrop-blur-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-200 hover:text-white">
                        <input
                            type="checkbox"
                            checked={filteredRuns.length > 0 && filteredRuns.every((r) => selectedRunIds.includes(r.id))}
                            onChange={() => {
                                const allFiltered = filteredRuns.map((r) => r.id);
                                const isAllSelected = allFiltered.length > 0 && allFiltered.every((id) => selectedRunIds.includes(id));
                                if (isAllSelected) {
                                    setSelectedRunIds((prev) => prev.filter((id) => !allFiltered.includes(id)));
                                } else {
                                    setSelectedRunIds((prev) => Array.from(new Set([...prev, ...allFiltered])));
                                }
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-white/10 text-rose-500 focus:ring-rose-500/30 cursor-pointer accent-rose-500"
                        />
                        Select All ({filteredRuns.length})
                    </label>
                    {selectedRunIds.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {selectedRunIds.length} selected
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedRunIds.length === 0 || isDeleting}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            selectedRunIds.length > 0 && !isDeleting
                                ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-600/30 border border-rose-400/40 cursor-pointer"
                                : "bg-white/[0.04] text-slate-500 border border-white/5 cursor-not-allowed opacity-50"
                        }`}
                    >
                        🗑️ Delete Selected{selectedRunIds.length ? ` (${selectedRunIds.length})` : ""}
                    </button>
                    <button
                        onClick={handleDeleteAll}
                        disabled={runs.length === 0 || isDeleting}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 border border-rose-500/30 transition-all cursor-pointer"
                        title="Permanently delete all call recordings in organization"
                    >
                        ⚠️ Delete All ({runs.length})
                    </button>
                </div>
            </div>

            {/* Call List Content */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                            <Skeleton className="h-6 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            ) : filteredRuns.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 mb-4 shadow-lg shadow-indigo-500/10">
                        <Music className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">No Call Recordings Found</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1.5">
                        {searchQuery
                            ? `No recordings match "${searchQuery}". Try adjusting your search or filters.`
                            : "Recordings are automatically created when your Voice Agents complete inbound or outbound calls."}
                    </p>
                    {activeFilter !== "all" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveFilter("all")}
                            className="mt-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                        >
                            View All Calls
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-3.5">
                    {filteredRuns.map((run) => {
                        const hasAudio = Boolean(run.recording_url || run.recording_public_url);
                        const isPlaying = playingRunId === run.id;
                        const isAudioLoading = audioLoadingRunId === run.id;
                        const isInbound =
                            run.call_type?.toLowerCase() === "inbound" ||
                            run.workflow_name?.toLowerCase().includes("inbound") ||
                            (run.called_number && !run.caller_number);

                        return (
                            <div
                                key={run.id}
                                className={`group relative rounded-2xl p-5 transition-all duration-300 border ${
                                    isPlaying
                                        ? "bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 border-indigo-500/60 shadow-xl shadow-indigo-500/20"
                                        : "bg-white/[0.03] hover:bg-white/[0.05] border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl"
                                } backdrop-blur-xl`}
                            >
                                {/* Call Card Header */}
                                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedRunIds.includes(run.id)}
                                            onChange={() => handleToggleSelect(run.id)}
                                            className="w-4 h-4 rounded border-white/20 bg-white/10 text-rose-500 focus:ring-rose-500/30 cursor-pointer accent-rose-500 mt-1 flex-shrink-0"
                                        />
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                            {/* Inbound / Outbound Direction Badge */}
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    isInbound
                                                        ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                                                        : "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                                                }`}
                                            >
                                                {isInbound ? (
                                                    <ArrowDownLeft className="h-3 w-3" />
                                                ) : (
                                                    <ArrowUpRight className="h-3 w-3" />
                                                )}
                                                {isInbound ? "Inbound Call" : "Outbound Call"}
                                            </span>

                                            {/* Run ID Link */}
                                            <Link
                                                href={`/usage?runId=${run.id}`}
                                                className="text-xs font-mono text-muted-foreground hover:text-indigo-300 transition-colors"
                                            >
                                                Call #{run.id}
                                            </Link>

                                            {/* Status Badge */}
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                Recorded
                                            </span>
                                        </div>

                                        <h4 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                                            {run.workflow_name || run.name || "Voice AI Agent"}
                                        </h4>

                                        {/* Phone Numbers & Timing */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                                            {(run.caller_number || run.called_number) && (
                                                <span className="flex items-center gap-1.5 text-slate-300">
                                                    <Phone className="h-3.5 w-3.5 text-indigo-400" />
                                                    {run.caller_number || "Caller"}
                                                    <span className="text-muted-foreground">→</span>
                                                    {run.called_number || "Dograh Agent"}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-slate-400">
                                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                {formatDateTime(run.created_at, timezone)} ({formatRelativeTime(run.created_at)})
                                            </span>
                                            <span className="font-medium text-slate-300">
                                                Duration: {formatSeconds(run.call_duration_seconds)}
                                            </span>
                                        </div>
                                    </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        {(run.transcript_url || run.transcript_public_url) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenTranscript(run)}
                                                className="h-8 px-3 rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs text-slate-300 hover:text-white"
                                            >
                                                <Eye className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                                                Transcript
                                            </Button>
                                        )}

                                        {hasAudio && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(run)}
                                                className="h-8 px-3 rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs text-slate-300 hover:text-white"
                                                title="Download .wav audio recording"
                                            >
                                                <Download className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
                                                WAV
                                            </Button>
                                        )}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteSingle(run.id, run.workflow_name || run.name)}
                                            disabled={isDeleting}
                                            className="h-8 px-3 rounded-xl border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                                            title="Permanently delete this call recording"
                                        >
                                            🗑️ Delete
                                        </Button>
                                    </div>
                                </div>

                                {/* Audio Player Bar (if recording available) */}
                                {hasAudio ? (
                                    <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-center gap-3">
                                        {/* Play / Pause Button with Glow */}
                                        <button
                                            onClick={() => handleTogglePlay(run)}
                                            disabled={isAudioLoading}
                                            className={`relative h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                                isPlaying
                                                    ? "bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105"
                                                    : "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105"
                                            }`}
                                            title={isPlaying ? "Pause audio" : "Play recording"}
                                        >
                                            {isAudioLoading ? (
                                                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                                            ) : isPlaying ? (
                                                <Pause className="h-4 w-4 fill-white text-white" />
                                            ) : (
                                                <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                                            )}
                                        </button>

                                        {/* Equalizer Visualizer Animation */}
                                        <div className="flex items-end gap-1 h-6 px-1.5 shrink-0">
                                            {[40, 75, 55, 90, 60, 80, 45].map((h, idx) => (
                                                <span
                                                    key={idx}
                                                    style={{
                                                        height: isPlaying ? `${Math.max(25, (h * (idx % 2 === 0 ? 1 : 0.8)))}%` : "20%",
                                                        animationDelay: `${idx * 0.15}s`,
                                                    }}
                                                    className={`w-1 rounded-full transition-all duration-200 ${
                                                        isPlaying
                                                            ? "bg-gradient-to-t from-indigo-400 to-cyan-300 animate-pulse"
                                                            : "bg-white/20"
                                                    }`}
                                                />
                                            ))}
                                        </div>

                                        {/* Progress Bar & Timers */}
                                        <div className="flex-1 w-full flex items-center gap-3">
                                            <span className="text-xs font-mono text-slate-300 w-10 text-right">
                                                {isPlaying ? formatSeconds(currentTime) : "00:00"}
                                            </span>

                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={isPlaying ? audioProgress : 0}
                                                onChange={handleSeek}
                                                disabled={!isPlaying}
                                                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400 disabled:opacity-40"
                                            />

                                            <span className="text-xs font-mono text-muted-foreground w-10">
                                                {formatSeconds(run.call_duration_seconds)}
                                            </span>
                                        </div>

                                        {/* Speed Multiplier Pill */}
                                        {isPlaying && (
                                            <button
                                                onClick={handleCycleSpeed}
                                                className="shrink-0 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono text-indigo-300 border border-white/10 transition-colors"
                                                title="Change playback speed"
                                            >
                                                {playbackRate}x
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-muted-foreground/80 italic flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                        Call was connected without audio capture, or duration under threshold.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Transcript Modal */}
            <Dialog open={transcriptModalOpen} onOpenChange={setTranscriptModalOpen}>
                <DialogContent className="max-w-2xl bg-[#0b0e1e]/95 border-white/10 backdrop-blur-2xl rounded-3xl p-6 text-white shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                            <Eye className="h-5 w-5 text-indigo-400" />
                            Call Transcript: #{selectedRunForTranscript?.id}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {selectedRunForTranscript?.workflow_name || "Voice AI Agent"} &middot;{" "}
                            {selectedRunForTranscript?.created_at &&
                                formatDateTime(selectedRunForTranscript.created_at, timezone)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10">
                        {isTranscriptLoading ? (
                            <div className="space-y-3 py-6">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        ) : transcriptContent ? (
                            <div className="text-sm font-sans whitespace-pre-wrap leading-relaxed text-slate-200">
                                {transcriptContent}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                                No transcript data captured for this conversation.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

