"use client";

import { ExternalLink, Mic, Music, Radio, Sparkles, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { PageLayout, PageSection } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

import CallRecordingsList from "./CallRecordingsList";
import RecordingsList from "./RecordingsList";
import { RecordingsUploadDialog } from "./RecordingsUploadDialog";
import TtsCacheList from "./TtsCacheList";

export default function RecordingsPage() {
    const { user, redirectToLogin, loading } = useAuth();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    if (loading || !user) {
        return (
            <PageLayout title="Recordings">
                <div className="space-y-4">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout
            title="Audio & Recordings"
            description={
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                    <span>
                        Inspect inbound & outbound call recordings, replay audio, review transcripts, and manage agent prompt audio.
                    </span>
                    <a
                        href="https://docs.dograh.com/voice-agent/pre-recorded-audio"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors"
                    >
                        Docs <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            }
        >
            <Tabs
                defaultValue="call-recordings"
                key={`${user.id}:${"selectedTeam" in user ? user.selectedTeam?.id : user.organizationId}`}
                className="space-y-6"
            >
                <TabsList className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl h-auto gap-1">
                    <TabsTrigger
                        value="call-recordings"
                        className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 transition-all flex items-center gap-2"
                    >
                        <Radio className="h-3.5 w-3.5" />
                        Call Recordings
                    </TabsTrigger>
                    <TabsTrigger
                        value="recordings"
                        className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 transition-all flex items-center gap-2"
                    >
                        <Music className="h-3.5 w-3.5" />
                        Prompt Snippets
                    </TabsTrigger>
                    <TabsTrigger
                        value="tts-cache"
                        className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 transition-all flex items-center gap-2"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        TTS Speech Cache
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Call Recordings (Default) */}
                <TabsContent value="call-recordings" className="mt-0 focus-visible:outline-none">
                    <PageSection
                        title="Call Recordings & Audio Stream"
                        description="Recordings of conversations captured between your voice agents and phone callers."
                    >
                        <CallRecordingsList refreshKey={refreshKey} />
                    </PageSection>
                </TabsContent>

                {/* Tab 2: Uploaded Prompt Audio Snippets */}
                <TabsContent value="recordings" className="mt-0 focus-visible:outline-none">
                    <PageSection
                        title="Agent Prompt Audio"
                        description="Audio snippets shared across agents in your organization. Insert using @ in prompts."
                        actions={
                            <Button
                                onClick={() => setIsUploadOpen(true)}
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 border border-white/10"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Audio Clip
                            </Button>
                        }
                    >
                        <RecordingsList refreshKey={refreshKey} />
                    </PageSection>
                </TabsContent>

                {/* Tab 3: TTS Speech Cache */}
                <TabsContent value="tts-cache" className="mt-0 focus-visible:outline-none">
                    <PageSection
                        title="Cached Speech Phrases"
                        description="Reused synthesized audio across your organization's workflows to minimize latency and provider TTS costs."
                    >
                        <TtsCacheList />
                    </PageSection>
                </TabsContent>
            </Tabs>

            <RecordingsUploadDialog
                open={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                onUploadComplete={() => setRefreshKey((k) => k + 1)}
            />
        </PageLayout>
    );
}
