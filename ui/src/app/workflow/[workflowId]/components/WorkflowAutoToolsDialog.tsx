"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Wrench,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ListPlus,
  ExternalLink,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWorkflowOptional } from "../contexts/WorkflowContext";

interface WorkflowAutoToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: number;
  workflowName: string;
}

export function WorkflowAutoToolsDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
}: WorkflowAutoToolsDialogProps) {
  const workflow = useWorkflowOptional();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);

  const handleAutoGenerate = async () => {
    try {
      setIsGenerating(true);
      setGeneratedResult(null);

      const res = await fetch(`/api/v1/tools/auto-generate-for-workflow/${workflowId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to auto-generate tools for workflow");
      }

      setGeneratedResult(data);
      toast.success(data.message || "Tools generated and attached successfully!");

      // Refresh tools in workflow context
      if (workflow?.refreshTools) {
        await workflow.refreshTools();
      }

      // Trigger a page reload or state refresh after short delay so canvas reflects attached tools
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      toast.error(err.message || "Failed to auto-generate tools");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#14151b] text-white border-[#272a38]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                Auto-Generate Agent Tools
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                Automatically analyzes agent node prompts and generates required HTTP API tools.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Agent info */}
          <div className="p-3 rounded-lg bg-[#1a1c26] border border-[#2b2f42] flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-gray-400">Target Agent Workflow</span>
              <p className="text-sm font-semibold text-white truncate max-w-[480px]">
                {workflowName}
              </p>
            </div>
            <Badge className="bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[11px]">
              Workflow #{workflowId}
            </Badge>
          </div>

          {/* Planned / Suggested tools */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Detected Agent Capabilities &amp; Required Tools
            </span>

            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-[#181a24] border border-[#26293a] flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Book Hospital Appointment
                      Save Customer Lead &amp; Schedule Consultation
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[10px] py-0 px-1.5">
                      POST
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Collects patient name, mobile, age, gender, hospital branch, doctor/department, date and time.
                    Records prospect name, mobile, email, project type, budget, timeline, and consultation slot directly into Appointments &amp; Leads.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#181a24] border border-[#26293a] flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Check Doctor &amp; Slot Availability
                      Check Consultation Availability
                    </span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-none text-[10px] py-0 px-1.5">
                      GET
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Queries available appointment slots by branch, department, or date so the agent can inform callers.
                    Queries open consultation and demo slots by date so the agent can offer available meeting times.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#181a24] border border-[#26293a] flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <RefreshCw className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Cancel or Reschedule Appointment
                      Cancel or Reschedule Consultation
                    </span>
                    <Badge className="bg-purple-500/20 text-purple-400 border-none text-[10px] py-0 px-1.5">
                      POST
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Enables the caller to reschedule or cancel an existing appointment using their code or phone number.
                    Enables the caller to reschedule or cancel an existing consultation using their confirmation code or phone number.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {generatedResult && (
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{generatedResult.message} Reloading workflow canvas...</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-white"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white gap-2 font-medium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Synthesizing &amp; Attaching Tools...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-blue-200" />
                ⚡ Auto-Generate &amp; Attach Tools
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

