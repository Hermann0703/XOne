"use client";

// 时间轴节点编辑器
// 在模板表单中管理模板节点列表，支持添加、删除、排序

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TimelineNode } from "./store";

// ─── 本地节点类型（支持新节点的临时ID） ────────────

export interface TimelineNodeDraft {
  _key: string;          // 唯一标识（已存在节点用 String(id)；新节点用临时字符串）
  id: number;            // 后端 ID（新节点为 -1）
  label: string;
  sort_order: number;
  icon_type: string;
  is_required: boolean;
  description: string;
}

// ─── 图标选项 ────────────────────────────────────────

const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "FileText", label: "文件" },
  { value: "CheckCircle", label: "审核" },
  { value: "PenTool", label: "签署" },
  { value: "Package", label: "交付" },
  { value: "Receipt", label: "收款" },
  { value: "Calendar", label: "日期" },
  { value: "Flag", label: "里程碑" },
  { value: "Bell", label: "提醒" },
  { value: "Clock", label: "时钟" },
  { value: "AlertCircle", label: "告警" },
  { value: "MessageSquare", label: "评论" },
  { value: "Upload", label: "上传" },
  { value: "Download", label: "下载" },
  { value: "Mail", label: "邮件" },
  { value: "Users", label: "团队" },
];

// ─── Props ───────────────────────────────────────────

interface TimelineNodeEditorProps {
  nodes: TimelineNodeDraft[];
  onChange: (nodes: TimelineNodeDraft[]) => void;
}

// ─── 辅助函数 ────────────────────────────────────────

let nextKey = 0;
function tempKey(): string {
  nextKey += 1;
  return `__new_${nextKey}`;
}

function blankNode(sortOrder: number): TimelineNodeDraft {
  return {
    _key: tempKey(),
    id: -1,
    label: "",
    sort_order: sortOrder,
    icon_type: "FileText",
    is_required: false,
    description: "",
  };
}

// ─── 组件 ────────────────────────────────────────────

export default function TimelineNodeEditor({
  nodes,
  onChange,
}: TimelineNodeEditorProps) {
  const t = useTranslations();

  // ─── 添加节点 ────────────────────────────────────

  const addNode = useCallback(() => {
    const newOrder = nodes.length > 0
      ? Math.max(...nodes.map((n) => n.sort_order)) + 1
      : 0;
    onChange([...nodes, blankNode(newOrder)]);
  }, [nodes, onChange]);

  // ─── 删除节点 ────────────────────────────────────

  const removeNode = useCallback(
    (key: string) => {
      onChange(nodes.filter((n) => n._key !== key));
    },
    [nodes, onChange]
  );

  // ─── 更新节点字段 ────────────────────────────────

  const updateNode = useCallback(
    (key: string, field: keyof TimelineNodeDraft, value: unknown) => {
      onChange(
        nodes.map((n) =>
          n._key === key ? { ...n, [field]: value } : n
        )
      );
    },
    [nodes, onChange]
  );

  // ─── 移动节点 ────────────────────────────────────

  const moveNode = useCallback(
    (key: string, direction: "up" | "down") => {
      const idx = nodes.findIndex((n) => n._key === key);
      if (idx < 0) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= nodes.length) return;
      const next = [...nodes];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      // 重新分配 sort_order
      onChange(next.map((n, i) => ({ ...n, sort_order: i })));
    },
    [nodes, onChange]
  );

  // ─── 渲染 ────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-secondary">
          {t("contracts.timelineTemplates.nodes")}
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addNode}
          className="gap-1"
        >
          <Plus className="size-3.5" />
          添加节点
        </Button>
      </div>

      {nodes.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          暂无节点，请点击「添加节点」按钮
        </div>
      ) : (
        <div className="space-y-2">
          {nodes.map((node, idx) => (
            <div
              key={node._key}
              className="flex items-start gap-2 rounded-md border bg-bg-card p-3"
            >
              {/* 排序按钮 */}
              <div className="flex flex-col gap-0.5 pt-1">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={idx === 0}
                  onClick={() => moveNode(node._key, "up")}
                  title="上移"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={idx === nodes.length - 1}
                  onClick={() => moveNode(node._key, "down")}
                  title="下移"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>

              <GripVertical className="size-4 text-muted-foreground mt-1.5 shrink-0 cursor-grab" />

              {/* 节点字段 */}
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={node.label}
                    onChange={(e) =>
                      updateNode(node._key, "label", e.target.value)
                    }
                    placeholder="节点名称"
                    className="flex-1"
                  />
                  <Select
                    value={node.icon_type}
                    options={ICON_OPTIONS}
                    onChange={(e) =>
                      updateNode(node._key, "icon_type", e.target.value)
                    }
                    className="w-28"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={node.is_required}
                      onChange={(e) =>
                        updateNode(node._key, "is_required", e.target.checked)
                      }
                      className="size-3.5 rounded"
                    />
                    必填
                  </label>

                  <Input
                    value={node.description}
                    onChange={(e) =>
                      updateNode(node._key, "description", e.target.value)
                    }
                    placeholder="描述（可选）"
                    className="flex-1 h-7 text-xs"
                  />
                </div>
              </div>

              {/* 删除 */}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title="删除节点"
                aria-label="删除节点"
                onClick={() => removeNode(node._key)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
