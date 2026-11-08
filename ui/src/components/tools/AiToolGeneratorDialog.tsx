"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Code2,
  Globe,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ToolResponse } from "@/client/types.gen";

interface AiToolGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  onToolCreated?: (tool: ToolResponse) => void;
}

export function AiToolGeneratorDialog({
  open,
  onOpenChange,
  initialPrompt = "",
  onToolCreated,
}: AiToolGeneratorDialogProps) {
  const [requirement, setRequirement] = useState(initialPrompt);
  const [baseUrl, setBaseUrl] = useState("http://localhost:8080");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<any | null>(null);
  const [createdTool, setCreatedTool] = useState<ToolResponse | null>(null);

  useEffect(() => {
    if (initialPrompt && open) {
      setRequirement(initialPrompt);
    }
  }, [initialPrompt, open]);

  const handleGenerateAndCreate = async (autoCreate: boolean) => {
    if (!requirement.trim()) {
      toast.error("Please describe what the tool should do.");
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedPreview(null);
      setCreatedTool(null);

      const res = await fetch("/api/v1/tools/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement: requirement.trim(),
          base_url: baseUrl.trim() || undefined,
          auto_create: autoCreate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to generate tool");
      }

      setGeneratedPreview(data.tool_request);

      if (data.created && data.tool) {
        setCreatedTool(data.tool);
        toast.success(`Tool "${data.tool.name}" created successfully!`);
        if (onToolCreated) {
          onToolCreated(data.tool);
        }
      } else {
        toast.success("Tool schema generated! Review and click Save.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate tool");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!generatedPreview) return;
    try {
      setIsGenerating(true);
      const res = await fetch("/api/v1/tools/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatedPreview),
      });

      const tool = await res.json();
      if (!res.ok) {
        throw new Error(tool.detail || "Failed to save tool");
      }

      setCreatedTool(tool);
      toast.success(`Tool "${tool.name}" created and saved!`);
      if (onToolCreated) {
        onToolCreated(tool);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not save tool");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-slate-100 p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Auto-Generate Tool with AI
                <Badge variant="outline" className="text-[10px] uppercase font-bold border-blue-500/40 text-blue-400 bg-blue-500/10">
                  Voice AI Ready
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Describe what your agent needs to do (e.g. appointment booking, patient lookup, slot check) and Dograh will automatically construct the HTTP schema.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Natural Language Prompt */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Agent Requirement / Action Description</span>
              <span className="text-[11px] text-slate-500">e.g. from agent prompt or workflow goals</span>
            </Label>
            <Textarea
              rows={3}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="e.g. Book an appointment: collect patient full name, age, gender, mobile number, branch, and preferred slot..."
              className="bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-600 resize-none font-sans"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-slate-500 self-center mr-1">Quick Presets:</span>
            {[
              "Book appointment with patient details & branch",
              "Check doctor availability on date",
              "Look up patient records by phone number",
              "Cancel appointment with reason",
            ].map((preset) => (
              <Badge
                key={preset}
                variant="outline"
                onClick={() => setRequirement(preset)}
                className="cursor-pointer text-[11px] border-slate-800 text-slate-400 hover:border-blue-500/50 hover:text-blue-300 transition-colors"
              >
                + {preset}
              </Badge>
            ))}
          </div>

          {/* Base URL (Optional) */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              API Base URL
            </Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:8080 (or your API domain)"
              className="bg-slate-900 border-slate-800 text-xs h-9 text-slate-300"
            />
          </div>

          {/* Generated Result Preview */}
          {generatedPreview && (
            <div className="rounded-xl border border-blue-500/30 bg-slate-900/60 p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{generatedPreview.name}</h4>
                    <p className="text-[11px] text-slate-400">{generatedPreview.description}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono text-[10px]">
                  {generatedPreview.definition?.config?.method || "POST"}
                </Badge>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs text-blue-300 break-all">
                {generatedPreview.definition?.config?.url}
              </div>

              {/* Parameters list */}
              {generatedPreview.definition?.config?.parameters?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Extracted Parameters ({generatedPreview.definition.config.parameters.length})
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {generatedPreview.definition.config.parameters.map((p: any) => (
                      <div
                        key={p.name}
                        className="p-2 bg-slate-950/80 rounded-md border border-slate-800 text-xs flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-white">{p.name}</span>
                          <span className="text-[10px] text-slate-500">{p.type}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {p.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createdTool ? (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Tool created and ready to use in your agent!
                  </span>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 font-mono text-[10px]">
                    UUID: {createdTool.tool_uuid.slice(0, 8)}...
                  </Badge>
                </div>
              ) : (
                <Button
                  onClick={handleConfirmSave}
                  disabled={isGenerating}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 font-medium"
                >
                  Confirm & Save Tool to Organization
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Close
          </Button>

          <Button
            onClick={() => handleGenerateAndCreate(true)}
            disabled={isGenerating || !requirement.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs h-9 shadow-lg shadow-blue-500/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Synthesizing Tool...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Auto-Build & Add Tool
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

