"use client";

import { Check, Circle, FileText, PenLine, PlayCircle, Flag, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Contract } from "./store";

interface Props {
  contract: Contract;
}

// 时间轴节点定义
interface TimelineNode {
  key: string;
  label: string;
  date?: string;
  icon: React.ReactNode;
  activeStatuses: string[];
}

const NODES: TimelineNode[] = [
  {
    key: "created",
    label: "合同创建",
    icon: <FileText className="size-4" />,
    activeStatuses: ["draft", "signed", "in_progress", "completed", "terminated"],
  },
  {
    key: "signed",
    label: "合同签署",
    date: undefined, // 运行时填入
    icon: <PenLine className="size-4" />,
    activeStatuses: ["signed", "in_progress", "completed", "terminated"],
  },
  {
    key: "in_progress",
    label: "合同履行",
    date: undefined,
    icon: <PlayCircle className="size-4" />,
    activeStatuses: ["in_progress", "completed"],
  },
  {
    key: "completed",
    label: "合同完成",
    date: undefined,
    icon: <Flag className="size-4" />,
    activeStatuses: ["completed"],
  },
  {
    key: "terminated",
    label: "合同终止",
    date: undefined,
    icon: <Ban className="size-4" />,
    activeStatuses: ["terminated"],
  },
];

export default function Timeline({ contract }: Props) {
  // 注入实际日期
  const nodes = NODES.map((n) => {
    let date: string | undefined;
    switch (n.key) {
      case "created": date = contract.created_at?.slice(0, 10); break;
      case "signed": date = contract.sign_date; break;
      case "in_progress": date = contract.start_date; break;
      case "completed": date = contract.end_date; break;
      case "terminated": date = undefined; break;
    }
    return { ...n, date };
  });

  // 当前状态索引
  const currentIdx = nodes.findIndex((n) => n.activeStatuses.includes(contract.status));

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="text-base">合同生命周期</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* 垂直连线 */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-0">
            {nodes.map((node, idx) => {
              const isCompleted = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isFuture = idx > currentIdx;

              return (
                <div key={node.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  {/* 节点图标 */}
                  <div className={`
                    relative z-10 flex items-center justify-center size-10 rounded-full border-2
                    ${isCompleted ? "bg-primary border-primary text-primary-foreground" : ""}
                    ${isCurrent ? "bg-primary/10 border-primary text-primary" : ""}
                    ${isFuture ? "bg-muted border-border text-text-secondary" : ""}
                  `}>
                    {isCompleted ? <Check className="size-4" /> : node.icon}
                  </div>

                  {/* 节点文字 */}
                  <div className="flex-1 min-w-0 pt-1">
                    <p className={`text-sm font-medium ${isFuture ? "text-text-secondary" : "text-text-primary"}`}>
                      {node.label}
                    </p>
                    {node.date && (
                      <p className={`text-xs mt-0.5 ${isFuture ? "text-text-secondary/50" : "text-text-secondary"}`}>
                        {node.date}
                      </p>
                    )}
                    {isCurrent && (
                      <span className="inline-block mt-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        当前状态
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
