"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useContractStore, type Fonds } from "./store";

const INITIAL: Partial<Fonds> = { name: "", code: "", description: "" };

export default function FondsManager() {
  const { fonds, fetchFonds, createFonds, updateFonds, deleteFonds } = useContractStore();
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Fonds>>({ ...INITIAL });
  const [isEdit, setIsEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFonds().then(() => setLoading(false));
  }, [fetchFonds]);

  const openCreate = () => { setIsEdit(false); setEditing({ ...INITIAL }); setDialogOpen(true); };
  const openEdit = (f: Fonds) => { setIsEdit(true); setEditing({ id: f.id, name: f.name, code: f.code, description: f.description }); setDialogOpen(true); };

  const handleSubmit = async () => {
    if (!editing.name?.trim() || !editing.code?.trim()) return;
    setSubmitting(true);
    if (isEdit && editing.id) await updateFonds(editing.id, editing);
    else await createFonds(editing);
    setSubmitting(false);
    setDialogOpen(false);
    fetchFonds();
  };

  const handleDelete = async (f: Fonds) => {
    if (!confirm(`确定删除全宗「${f.name}」吗？`)) return;
    await deleteFonds(f.id);
    fetchFonds();
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">全宗管理</h1>
        <Button onClick={openCreate}><Plus className="size-4 mr-1" />新建全宗</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>编码</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fonds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-text-secondary py-10">暂无全宗数据</TableCell>
                  </TableRow>
                ) : (
                  fonds.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="font-mono text-sm">{f.code}</TableCell>
                      <TableCell className="text-sm text-text-secondary max-w-[200px] truncate">{f.description || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-xs" aria-label="编辑全宗" onClick={() => openEdit(f)}><Pencil className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon-xs" aria-label="删除全宗" onClick={() => handleDelete(f)}><Trash2 className="size-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isEdit ? "编辑全宗" : "新建全宗"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">名称 *</label>
              <Input value={editing.name || ""} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} placeholder="全宗名称" />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">编码 *</label>
              <Input value={editing.code || ""} onChange={(e) => setEditing((p) => ({ ...p, code: e.target.value }))} placeholder="全宗编码" />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">描述</label>
              <Textarea value={editing.description || ""} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} placeholder="描述信息" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting || !editing.name?.trim() || !editing.code?.trim()}>
              {submitting ? "保存中..." : isEdit ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
