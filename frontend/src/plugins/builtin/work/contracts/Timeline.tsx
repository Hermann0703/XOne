"use client";

// Timeline component — template-based milestone visualization with
// dropdown selector and status-driven node rendering.

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Check, Circle, FileText, GitBranch, ClipboardCheck,
  FileCheck, ShoppingCart, RefreshCw, DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { apiGet } from "@/lib/api/client";
import type {
  Contract,
  TimelineTemplate,
  TimelineNode,
} from "./store";

// ─── Props ────────────────────────────────────────────

interface Props {
  contract: Contract;
  readonly?: boolean;
}

// ─── Icon mapping ─────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "file-text": FileText,
  "git-branch": GitBranch,
  "clipboard-check": ClipboardCheck,
  "file-check": FileCheck,
  "shopping-cart": ShoppingCart,
  "refresh-cw": RefreshCw,
  "dollar-sign": DollarSign,
  circle: Circle,
  // PascalCase (backward compat)
  FileText,
  GitBranch,
  ClipboardCheck,
  FileCheck,
  ShoppingCart,
  RefreshCw,
  DollarSign,
  Circle,
};

function resolveIcon(iconType: string) {
  const Cmp = ICON_MAP[iconType];
  return Cmp ? <Cmp className="size-4" /> : <Circle className="size-4" />;
}

// ─── Date resolution ──────────────────────────────────

function resolveDate(node: TimelineNode, contract: Contract): string | undefined {
  switch (node.date_source) {
    case "sign_date":
      return contract.sign_date;
    case "start_date":
      return contract.start_date;
    case "end_date":
      return contract.end_date;
    case "created_at":
      return contract.created_at?.slice(0, 10);
    default:
      return undefined;
  }
}

// ─── Status helpers ────────────────────────────────────

type NodeStatus = "completed" | "current" | "pending";

/**
 * For template nodes, the "current" node is the last one whose
 * active_statuses includes contract.status. Everything before is
 * "completed"; everything after is "pending".
 */
function getTemplateNodeStatus(
  idx: number,
  currentTemplateIdx: number,
): NodeStatus {
  if (currentTemplateIdx < 0) return "pending";
  if (idx < currentTemplateIdx) return "completed";
  if (idx === currentTemplateIdx) return "current";
  return "pending";
}

// ─── Main component

function TimelineItem({
  icon,
  label,
  date,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  date?: string;
  status: NodeStatus;
}) {
  const t = useTranslations();
  const isCompleted = status === "completed";
  const isCurrent = status === "current";
  const isFuture = status === "pending";

  return (
    <div className="relative flex items-start gap-4 pb-6 last:pb-0">
      {/* node circle */}
      <div
        className={[
          "relative z-10 flex items-center justify-center size-10 rounded-full border-2",
          isCompleted ? "bg-primary border-primary text-primary-foreground" : "",
          isCurrent ? "bg-primary/10 border-primary text-primary" : "",
          isFuture ? "bg-muted border-border text-text-secondary" : "",
        ].join(" ")}
      >
        {isCompleted ? <Check className="size-4" /> : icon}
      </div>

      {/* node text */}
      <div className="flex-1 min-w-0 pt-1">
        <p
          className={
            "text-sm font-medium " +
            (isFuture ? "text-text-secondary" : "text-text-primary")
          }
        >
          {label}
        </p>
        {date && (
          <p
            className={
              "text-xs mt-0.5 " +
              (isFuture ? "text-text-secondary/50" : "text-text-secondary")
            }
          >
            {date}
          </p>
        )}
        {isCurrent && (
          <span className="inline-block mt-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
            {t("contracts.timeline.currentStatus")}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────

export default function Timeline({ contract, readonly }: Props) {
  const t = useTranslations();

  // templates list
  const [templates, setTemplates] = useState<TimelineTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // selected template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateNodes, setTemplateNodes] = useState<TimelineNode[]>([]);

  // ─── Fetch templates ────────────────────────────

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiGet<TimelineTemplate[]>(
        "/work/contracts/timeline-templates",
      );
      if (res.code === 0) setTemplates(res.data || []);
    } catch {
      // silent
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ─── Auto-select contract's bound template ──────
  useEffect(() => {
    if (!contract.timeline_template_id) return;
    setSelectedTemplateId(String(contract.timeline_template_id));
  }, [contract.timeline_template_id]);

  // ─── Fetch template nodes on selection change ────

  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplateNodes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<TimelineTemplate>(
          `/work/contracts/timeline-templates/${selectedTemplateId}`,
        );
        if (!cancelled && res.code === 0 && res.data?.nodes) {
          setTemplateNodes(
            [...res.data.nodes].sort((a, b) => a.sort_order - b.sort_order),
          );
        }
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId]);

  // ─── Compute statuses ───────────────────────────

  const sortedTemplateNodes = templateNodes;

  // Find the index of the "current" template node — the last one
  // whose active_statuses includes contract.status.
  const currentTemplateIdx = (() => {
    let lastIdx = -1;
    for (let i = 0; i < sortedTemplateNodes.length; i++) {
      if (sortedTemplateNodes[i].active_statuses?.includes(contract.status)) {
        lastIdx = i;
      }
    }
    return lastIdx;
  })();

  const hasAnyNodes = sortedTemplateNodes.length > 0;

  // ─── Render ─────────────────────────────────────

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="text-base">
          {t("contracts.timeline.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Template selector */}
        <div className="mb-4">
          <Select
            placeholder={t("contracts.timeline.selectTemplate")}
            options={templates.map((tmpl) => ({
              value: String(tmpl.id),
              label: tmpl.name,
            }))}
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={loadingTemplates || readonly}
          />
        </div>

        {/* Timeline display */}
        {hasAnyNodes ? (
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-0">
              {sortedTemplateNodes.map((node, idx) => (
                <TimelineItem
                  key={`tpl-${node.id}`}
                  icon={resolveIcon(node.icon_type)}
                  label={node.label}
                  date={resolveDate(node, contract)}
                  status={getTemplateNodeStatus(idx, currentTemplateIdx)}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-6">
            {t("contracts.timeline.noTemplate")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
