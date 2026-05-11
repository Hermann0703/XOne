"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Check, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContractStore, type Milestone } from "./store";

interface Props {
  contractId: number;
}

const INITIAL_MILESTONE: Partial<Milestone> = {
  name: "",
  amount: undefined,
  due_date: "",
  status: "pending",
  remark: "",
};

export default function MilestoneTable({ contractId }: Props) {
  const { milestones, fetchMilestones, createMilestone, updateMilestone, deleteMilestone } = useContractStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Milestone>>({ ...INITIAL_MILESTONE });
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMilestones(contractId);
  }, [contractId, fetchMilestones]);

  const openCreateDialog = () => {
    setIsEditMode(false);
    setEditing({ ...INITIAL_MILESTONE });
    setDialogOpen(true);
  };

  const openEditDialog = (m: Milestone) => {
    setIsEditMode(true);
    setEditing({
      id: m.id,
      name: m.name,
      amount: m.amount,
      due_date: m.due_date || "",
      status: m.status,
      remark: m.remark || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editing.name?.trim()) return;
    setSubmitting(true);
    const data = { ...editing, contract_id: contractId };
    if (isEditMode && editing.id) {
      await updateMilestone(editing.id, data);
    } else {
      await createMilestone(data);
    }
    setSubmitting(false);
    setDialogOpen(false);
    fetchMilestones(contractId);
  };

  const handleComplete = async (m: Milestone) => {
    await updateMilestone(m.id, { ...m, contract_id: contractId, status: "completed" });
    fetchMilestones(contractId);
  };

  const handleDelete = async (m: Milestone) => {
    if (!confirm(`确定要删除里程碑「${m.name}」吗？`)) return;
    await deleteMilestone(m.id);
    fetchMilestones(contractId);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">里程碑</h3>
        <Button variant="outline" size="sm" onClick={openCreateDialog}>
          <Plus className="size-3.5 mr-1" />
          添加里程碑
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead className="w-[100px]">金额</TableHead>
            <TableHead className="w-[120px]">计划日期</TableHead>
            <TableHead className="w-[80px]">状态</TableHead>
            <TableHead className="w-[120px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {milestones.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-text-secondary py-6">
                暂无里程碑，点击上方按钮添加
              </TableCell>
            </TableRow>
          ) : (
            milestones.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-right">
                  {m.amount != null ? `¥${m.amount.toLocaleString()}` : "-"}
                </TableCell>
                <TableCell className="text-sm">{m.due_date || "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    m.status === "completed"
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-yellow-100 text-yellow-700 border-yellow-300"
                  }>
                    {m.status === "completed" ? "已完成" : "待完成"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {m.status !== "completed" && (
                      <Button variant="ghost" size="icon-xs" title="标记完成" aria-label="标记完成" onClick={() => handleComplete(m)}>
                        <Check className="size-3.5 text-green-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-xs" title="编辑" aria-label="编辑里程碑" onClick={() => openEditDialog(m)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" title="删除" aria-label="删除里程碑" onClick={() => handleDelete(m)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* 添加/编辑里程碑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "编辑里程碑" : "添加里程碑"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">名称 *</label>
              <Input value={editing.name || ""} onChange={(e) => setEditing((prev) => ({ ...prev, name: e.target.value }))} placeholder="请输入里程碑名称" />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">金额</label>
              <Input type="number" value={editing.amount ?? ""} onChange={(e) => setEditing((prev) => ({ ...prev, amount: e.target.value ? Number(e.target.value) : undefined }))} placeholder="请输入金额" />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">计划日期</label>
              <Input type="date" value={editing.due_date || ""} onChange={(e) => setEditing((prev) => ({ ...prev, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">备注</label>
              <Input value={editing.remark || ""} onChange={(e) => setEditing((prev) => ({ ...prev, remark: e.target.value }))} placeholder="备注信息" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting || !editing.name?.trim()}>
              {submitting ? "保存中..." : isEditMode ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
