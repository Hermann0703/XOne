"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import {
  GitBranch, CheckCircle2, ArrowRight, Clock, Loader2,
  LinkIcon, ExternalLink, Plus, X, Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiGet, apiPost, apiPut } from "@/lib/api/client";
// ── 类型 ──────────────────────────────────────────────────────────────

interface LifecycleStage {
  id: number;
  template_id: number;
  name: string;
  stage_type: string;
  sort_order: number;
  description?: string;
  color?: string;
  is_required: boolean;
  auto_transition_days: number;
  created_at?: string;
  updated_at?: string;
}

interface LifecycleTemplate {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  stages: LifecycleStage[];
}

interface LifecycleStatus {
  contract_id: number;
  has_lifecycle: boolean;
  template?: LifecycleTemplate;
  current_stage?: LifecycleStage;
  stage_stats?: Record<number, {
    entered_at: string | null;
    left_at: string | null;
    duration_hours: number | null;
  }>;
  stage_links?: Record<number, StageLink[]>;  // stage_id → 链接列表
}

interface HistoryEntry {
  id: number;
  contract_id: number;
  lifecycle_id: number;
  from_stage_id?: number;
  to_stage_id: number;
  from_stage_name?: string;
  to_stage_name: string;
  triggered_by: string;
  operator_id: string;
  notes?: string;
  created_at: string;
}

interface StageLink {
  url: string;
  label: string;
}

// ── 常量 ──────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  drafting: "拟定",
  review: "审核",
  signing: "签署",
  execution: "履约",
  renewal: "续约",
  termination: "停止",
  archived: "归档",
  custom: "自定义",
};

const STAGE_COLORS: Record<string, string> = {
  drafting: "#3b82f6",
  review: "#f59e0b",
  signing: "#8b5cf6",
  execution: "#10b981",
  renewal: "#ec4899",
  termination: "#ef4444",
  archived: "#6b7280",
  custom: "#6b7280",
};

// ── API 辅助 ──────────────────────────────────────────────────────────

async function fetchLifecycleStatus(contractId: number): Promise<LifecycleStatus | null> {
  const res = await apiGet<LifecycleStatus>(`/work/contracts/${contractId}/lifecycle`);
  return res.code === 0 ? res.data : null;
}

async function advanceStage(contractId: number, notes?: string) {
  const res = await apiPost(`/work/contracts/${contractId}/lifecycle/advance`, { notes });
  return res.code === 0 ? res.data : null;
}

async function fetchHistory(contractId: number): Promise<HistoryEntry[]> {
  const res = await apiGet<HistoryEntry[]>(`/work/contracts/${contractId}/lifecycle/history`);
  return res.code === 0 ? res.data ?? [] : [];
}

async function updateStageLinks(
  contractId: number,
  stageLinks: Record<number, StageLink[]>,
): Promise<Record<number, StageLink[]> | null> {
  const res = await apiPut<Record<number, StageLink[]>>(
    `/work/contracts/${contractId}/lifecycle/stage-links`,
    { stage_links: stageLinks },
  );
  return res.code === 0 ? res.data : null;
}

// ── Props ─────────────────────────────────────────────────────────────

interface LifecyclePanelProps {
  contractId: number;
  lifecycleId?: number | null;
}

// ── 组件 ──────────────────────────────────────────────────────────────

export default function LifecyclePanel({ contractId, lifecycleId }: LifecyclePanelProps) {
  const [status, setStatus] = useState<LifecycleStatus | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lc, hist] = await Promise.all([
        fetchLifecycleStatus(contractId).catch(() => null),
        fetchHistory(contractId).catch(() => []),
      ]);
      setStatus(lc);
      setHistory(hist);
    } catch {
      setStatus(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      await advanceStage(contractId);
      toast.success("已推进到下一阶段");
      await loadData();
    } catch {
      toast.error("推进失败，请重试");
    } finally {
      setAdvancing(false);
    }
  };

  // ── 阶段链接管理 ──
  const stageLinks = useMemo<Record<number, StageLink[]>>(
    () => {
      const raw = status?.stage_links ?? {};
      if (Array.isArray(raw)) return {}; // 防御性
      const converted: Record<number, StageLink[]> = {};
      for (const [key, val] of Object.entries(raw)) {
        converted[Number(key)] = val as StageLink[];
      }
      return converted;
    },
    [status?.stage_links],
  );

  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [savingLinks, setSavingLinks] = useState(false);

  const handleSaveLinks = async (stageId: number, links: StageLink[]) => {
    setSavingLinks(true);
    try {
      const updated = { ...stageLinks, [stageId]: links };
      const result = await updateStageLinks(contractId, updated);
      if (result) {
        setStatus((prev) => prev ? { ...prev, stage_links: result } : prev);
        toast.success("链接已更新");
      }
    } catch {
      toast.error("保存链接失败");
    } finally {
      setSavingLinks(false);
    }
  };

  // ── 加载态 ──
  if (loading) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  // ── 无生命周期绑定 ──
  if (!lifecycleId || !status?.has_lifecycle || !status?.template) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <GitBranch className="size-10 mb-3 text-muted-foreground/40" />
        <p className="text-sm text-text-secondary mb-2">此合同尚未绑定生命周期模板</p>
        <p className="text-xs text-text-tertiary">
          请在编辑合同页面选择一个生命周期模板来启用阶段管理
        </p>
      </div>
    );
  }

  const template = status.template;
  const currentStage = status.current_stage;
  const stages = template.stages || [];

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-text-secondary">
        <GitBranch className="size-10 mb-3 text-muted-foreground/40" />
        <p className="text-sm">该生命周期模板尚未配置阶段，请先在模板管理中设置。</p>
      </div>
    );
  }

  // ── 辅助函数 ──
  const getStageColor = (stage: LifecycleStage): string =>
    STAGE_COLORS[stage.stage_type] || "#6b7280";

  const isCompleted = (stage: LifecycleStage): boolean =>
    !!currentStage && stage.sort_order < currentStage.sort_order;

  const isCurrent = (stage: LifecycleStage): boolean =>
    !!currentStage && stage.id === currentStage.id;

  const isFuture = (stage: LifecycleStage): boolean =>
    !!currentStage && stage.sort_order > currentStage.sort_order;

  const isLastStage = (): boolean => {
    if (!currentStage || stages.length === 0) return true;
    const maxSort = Math.max(...stages.map((s) => s.sort_order));
    return currentStage.sort_order >= maxSort;
  };

  // ── 渲染 ──
  return (
    <div className="space-y-4 p-1">
      {/* 模板标题 */}
      <div className="flex items-center gap-2">
        <GitBranch className="size-4 text-primary" />
        <span className="text-sm font-medium">{template.name || "生命周期"}</span>
        {template.description && (
          <span className="text-xs text-text-tertiary truncate max-w-[200px]">
            — {template.description}
          </span>
        )}
      </div>

      {/* 阶段进度条 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-1">
            {stages.map((stage, idx) => {
              const completed = isCompleted(stage);
              const current = isCurrent(stage);
              const color = getStageColor(stage);
              return (
                <Fragment key={stage.id}>
                  <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    {/* 圆点 */}
                    <div
                      className="flex items-center justify-center size-8 rounded-full border-2 text-xs font-bold"
                      style={{
                        borderColor: completed
                          ? "#10b981"
                          : current
                            ? color
                            : "#9ca3af",
                        backgroundColor: current ? color : "transparent",
                        color: current ? "#ffffff" : completed ? "#10b981" : "#9ca3af",
                      }}
                    >
                      {completed ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    {/* 阶段名 */}
                    <span
                      className={`text-xs text-center truncate w-full ${
                        current
                          ? "font-bold"
                          : completed
                            ? "text-green-600"
                            : "text-muted-foreground"
                      }`}
                    >
                      {stage.name}
                    </span>
                    {/* 阶段类型标签 */}
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 shrink-0"
                      style={{
                        borderColor: isFuture(stage) ? "#d1d5db" : color,
                        color: isFuture(stage) ? "#9ca3af" : color,
                      }}
                    >
                      {STAGE_LABELS[stage.stage_type] || stage.stage_type}
                    </Badge>
                  </div>
                  {/* 箭头连接 */}
                  {idx < stages.length - 1 && (
                    <ArrowRight
                      className={`size-3 shrink-0 mt-[-16px] ${
                        isCompleted(stages[idx + 1]) || isCurrent(stages[idx + 1])
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 阶段补充链接 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <LinkIcon className="size-4" />
            阶段补充链接
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((stage, stageIdx) => {
            const links = stageLinks[stageIdx + 1] ?? [];
            return (
              <div key={stage.id} className="flex items-start gap-3">
                {/* 阶段标识 */}
                <div className="shrink-0 mt-1">
                  <div
                    className="size-5 rounded-full"
                    style={{ backgroundColor: getStageColor(stage) }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {stage.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {STAGE_LABELS[stage.stage_type] || stage.stage_type}
                    </Badge>
                  </div>

                  {/* 已有链接 */}
                  {links.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {links.map((link, li) => (
                        <a
                          key={li}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] bg-muted/50 hover:bg-muted px-2 py-0.5 rounded border border-border text-primary underline-offset-2 hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          {link.label || link.url}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-tertiary mb-1.5">暂无链接</p>
                  )}

                  {/* 编辑链接按钮（独立于 Dialog，否则关闭时按钮不渲染） */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setEditingStageId(stageIdx + 1)}
                  >
                    <Pencil className="size-3 mr-1" />
                    编辑链接
                  </Button>

                  {/* 编辑链接 Dialog（只在打开时渲染，只含弹窗内容） */}
                  <Dialog
                    open={editingStageId === stageIdx + 1}
                    onOpenChange={(open) => setEditingStageId(open ? stageIdx + 1 : null)}
                  >
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="text-sm">
                          编辑阶段链接 — {stage.name}
                        </DialogTitle>
                      </DialogHeader>
                      <StageLinksEditor
                        initial={links}
                        onSave={(updated) => {
                          handleSaveLinks(stageIdx + 1, updated);
                          setEditingStageId(null);
                        }}
                        saving={savingLinks}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 当前阶段信息 */}
      {currentStage && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-text-tertiary">当前阶段</span>
                <p
                  className="text-sm font-medium mt-0.5"
                  style={{ color: getStageColor(currentStage) }}
                >
                  {STAGE_LABELS[currentStage.stage_type] || currentStage.stage_type} ·{" "}
                  {currentStage.name}
                </p>
                {currentStage.description && (
                  <p className="text-xs text-text-tertiary mt-1">{currentStage.description}</p>
                )}
              </div>
              <Button
                onClick={handleAdvance}
                disabled={advancing || isLastStage()}
                variant={isLastStage() ? "outline" : "default"}
                size="sm"
              >
                {advancing ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <GitBranch className="size-4 mr-1" />
                )}
                {isLastStage() ? "已是最后阶段" : "推进"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 流转历史 */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm">流转历史</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-4">暂无流转记录</p>
          ) : (
            <div className="space-y-1.5">
              {history.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-2 text-xs text-text-secondary"
                >
                  <Clock className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">
                    {log.from_stage_name || "开始"} → {log.to_stage_name}
                  </span>
                  <span className="text-text-tertiary shrink-0">
                    {new Date(log.created_at).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {log.notes && (
                    <span className="italic text-text-tertiary truncate hidden sm:inline">
                      &ldquo;{log.notes}&rdquo;
                    </span>
                  )}
                </div>
              ))}
              {history.length > 8 && (
                <p className="text-xs text-text-tertiary text-center pt-1">
                  仅显示最近 8 条，共 {history.length} 条记录
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── 阶段链接编辑器（子组件） ──────────────────────────────────────────

function StageLinksEditor({
  initial,
  onSave,
  saving,
}: {
  initial: StageLink[];
  onSave: (links: StageLink[]) => void;
  saving: boolean;
}) {
  const [links, setLinks] = useState<StageLink[]>(initial);

  useEffect(() => {
    setLinks(initial);
  }, [initial]);

  const handleAdd = () => {
    setLinks([...links, { url: "", label: "" }]);
  };

  const handleChange = (index: number, field: keyof StageLink, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
  };

  const handleRemove = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const validLinks = links.filter((l) => l.url.trim());

  return (
    <div className="space-y-3">
      {links.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-4">
          暂无链接，点击下方按钮添加
        </p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {links.map((link, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2 rounded border border-border bg-muted/30"
            >
              <div className="flex-1 space-y-1.5">
                <Input
                  placeholder="链接地址 (URL)"
                  value={link.url}
                  onChange={(e) => handleChange(idx, "url", e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="链接描述（可选）"
                  value={link.label}
                  onChange={(e) => handleChange(idx, "label", e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 mt-0.5"
                onClick={() => handleRemove(idx)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-7 text-xs"
        >
          <Plus className="size-3 mr-1" />
          添加链接
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(validLinks)}
          disabled={saving || (validLinks.length === 0 && initial.length === 0)}
          className="h-7 text-xs"
        >
          {saving ? (
            <>
              <Loader2 className="size-3 mr-1 animate-spin" />
              保存中
            </>
          ) : (
            "保存"
          )}
        </Button>
      </div>
    </div>
  );
}
