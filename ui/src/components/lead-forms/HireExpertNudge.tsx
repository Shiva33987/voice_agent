"use client";

import { UserRound, X } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

import { PostHogEvent } from "@/constants/posthog-events";
import { useLeadForms } from "@/context/LeadFormsContext";

interface HireExpertNudgeProps {
  workflowId: number;
}

// Timings. Override SHOW_DELAY_MS to a few seconds during manual testing.
const SHOW_DELAY_MS = 5 * 60 * 1000; // 5 minutes on the builder
const AUTO_FADE_MS = 30 * 1000; // visible for 30s

function nudgeDoneKey(workflowId: number) {
  return `dograh:hireNudge:${workflowId}`;
}

export function HireExpertNudge(_props: HireExpertNudgeProps) {
  return null;
}
