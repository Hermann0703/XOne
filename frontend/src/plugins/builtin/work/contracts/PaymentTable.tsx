"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileText, Paperclip, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
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
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContractStore, type ContractPayment, type ContractPaymentAttachment } from "./store";

interface Props {
  contractId: number;
  contractAmount?: number | null;
  currency?: string | null;
}

const INITIAL_PAYMENT: Partial<ContractPayment> = {
  name: "",
  amount: undefined,
  currency: "CNY",
  acceptance_date: "",
  actual_payment_date: "",
  status: "pending",
  sort_order: 0,
  notes: "",
};

const PAYMENT_NAME_OPTIONS = ["首付款", "进度款", "尾款", "质保金", "自定义"];

const PAYMENT_STATUS_OPTIONS: Array<{ value: NonNullable<ContractPayment["status"]>; label: string }> = [
  { value: "pending", label: "待付" },
  { value: "paid", label: "已付" },
  { value: "cancelled", label: "取消" },
];

const getPaymentStatusLabel = (status?: ContractPayment["status"] | null) =>
  PAYMENT_STATUS_OPTIONS.find((option) => option.value === (status || "pending"))?.label || "待付";

const normalizeAmount = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  return Number(numeric.toFixed(2));
};

const normalizeRatio = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  return Number(numeric.toFixed(2));
};

const amountFromRatio = (contractAmount: number | null | undefined, ratio: number | undefined): number | undefined => {
  const baseAmount = Number(contractAmount || 0);
  if (ratio === undefined || baseAmount <= 0) return undefined;
  return Number(((baseAmount * ratio) / 100).toFixed(2));
};

const formatAmountInputValue = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "";
  return Number(value).toFixed(2);
};

export default function PaymentTable({ contractId, contractAmount, currency = "CNY" }: Props) {
  const {
    payments,
    fetchPayments,
    updatePayment,
    uploadPaymentAttachment,
    deletePaymentAttachment,
    previewPaymentAttachment,
  } = useContractStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("PDF预览");
  const [editing, setEditing] = useState<Partial<ContractPayment>>({ ...INITIAL_PAYMENT, currency: currency || "CNY" });
  const [amountInput, setAmountInput] = useState("");
  const [ratioInput, setRatioInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const uploadRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchPayments(contractId);
  }, [contractId, fetchPayments]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const summary = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const unpaid = payments.filter((p) => p.status !== "paid" && p.status !== "cancelled").reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const diff = total - Number(contractAmount || 0);
    return { total, paid, unpaid, diff };
  }, [payments, contractAmount]);

  const formatMoney = (amount?: number | null, c = currency || "CNY") => {
    if (amount == null) return "-";
    return `${c} ${Number(amount).toLocaleString()}`;
  };

  const openEditDialog = (payment: ContractPayment) => {
    setEditing({ ...payment });
    setAmountInput(formatAmountInputValue(payment.amount));
    setRatioInput(getPaymentRatio(payment.amount));
    setDialogOpen(true);
  };

  const cleanPayload = (data: Partial<ContractPayment>) => ({
    name: data.name?.trim(),
    amount: normalizeAmount(data.amount),
    currency: data.currency || currency || "CNY",
    acceptance_date: data.acceptance_date || undefined,
    actual_payment_date: data.actual_payment_date || undefined,
    status: data.status || "pending",
    sort_order: data.sort_order ?? 0,
    notes: data.notes?.trim() || undefined,
  });

  const handleSubmit = async () => {
    if (!editing.name?.trim()) {
      toast("请填写期次名称");
      return;
    }

    const ratio = normalizeRatio(ratioInput);
    if (ratioInput !== "" && ratio === undefined) {
      toast("付款比例必须为大于等于 0 的有效数值");
      return;
    }
    if (ratioInput !== "" && Number(contractAmount || 0) <= 0) {
      toast("合同金额为空，无法按付款比例计算金额");
      return;
    }

    const manualAmount = normalizeAmount(amountInput);
    if (amountInput !== "" && manualAmount === undefined) {
      toast("金额必须为大于等于 0 的有效数值");
      return;
    }
    const amount = ratio !== undefined ? amountFromRatio(contractAmount, ratio) : manualAmount;
    if (typeof editing.id !== "number") {
      toast("编辑失败：无效的付款条目ID");
      return;
    }
    setSubmitting(true);
    const payload = cleanPayload({ ...editing, amount });
    try {
      const result = await updatePayment(editing.id, payload);
      if (result) {
        toast("付款期次已更新");
        setDialogOpen(false);
        fetchPayments(contractId);
      } else {
        toast("保存失败，请检查输入");
      }
    } finally {
      setSubmitting(false);
    }
  };
  // ▸▸▸ 编辑/上传/预览 ▸▸▸
  const getPaymentRatio = (amount?: number | null) => {
    const baseAmount = Number(contractAmount || 0);
    if (!amount || baseAmount <= 0) return "";
    return Number(((Number(amount) / baseAmount) * 100).toFixed(2)).toString();
  };

  const handleUpload = async (paymentId: number, file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast("仅支持上传 PDF 文件");
      return;
    }
    const result = await uploadPaymentAttachment(paymentId, file);
    toast(result ? "附件上传成功" : "附件上传失败");
    fetchPayments(contractId);
  };

  const handlePreview = async (attachment: ContractPaymentAttachment) => {
    const url = await previewPaymentAttachment(attachment.id);
    if (!url) {
      toast("预览失败");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);
    setPreviewTitle(attachment.original_name);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewOpen(false);
  };

  const handleDeleteAttachment = async (attachment: ContractPaymentAttachment) => {
    if (!confirm(`确定删除附件「${attachment.original_name}」吗？`)) return;
    const ok = await deletePaymentAttachment(attachment.id);
    toast(ok ? "附件已删除" : "删除附件失败");
    if (ok) fetchPayments(contractId);
  };

  const editingPayment = typeof editing.id === "number" ? payments.find((payment) => payment.id === editing.id) : undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">付款计划</CardTitle>
          {/* 付款计划通过合同编辑页面的模板进行管理，不在此处新增/删除条目 */}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <SummaryItem label="合同金额" value={formatMoney(contractAmount)} />
          <SummaryItem label="计划合计" value={formatMoney(summary.total)} />
          <SummaryItem label="已付款" value={formatMoney(summary.paid)} />
          <SummaryItem label="未付款" value={formatMoney(summary.unpaid)} />
          <SummaryItem label="差额" value={formatMoney(summary.diff)} warning={Math.abs(summary.diff) > 0.009} />
        </div>
        {Math.abs(summary.diff) > 0.009 && (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            付款计划合计与合同金额存在差额，仅作提醒，不影响保存。
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>期次</TableHead>
                <TableHead>付款比例</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>验收日期</TableHead>
                <TableHead>实际付款时间</TableHead>
                <TableHead>附件</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-text-secondary py-8">
                    暂无付款计划，请前往合同编辑页面选择付款模板生成付款计划。
                  </TableCell>
                </TableRow>
              ) : payments.map((payment) => {
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="min-w-[120px] font-medium text-text-primary">
                      {payment.name || "-"}
                    </TableCell>
                    <TableCell className="min-w-[110px] text-text-secondary">
                      {getPaymentRatio(payment.amount) ? `${getPaymentRatio(payment.amount)}%` : "-"}
                    </TableCell>
                    <TableCell className="min-w-[130px] text-text-primary">
                      {formatMoney(payment.amount, payment.currency || currency || "CNY")}
                    </TableCell>
                    <TableCell className="min-w-[110px]">
                      <span className="inline-flex rounded-full border border-border bg-bg-card px-2 py-1 text-xs text-text-primary">
                        {getPaymentStatusLabel(payment.status)}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[150px] text-text-secondary">
                      {payment.acceptance_date || "-"}
                    </TableCell>
                    <TableCell className="min-w-[150px] text-text-secondary">
                      {payment.actual_payment_date || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {payment.attachments?.length ? payment.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-1 text-xs">
                            <FileText className="size-3.5 text-primary" />
                            <button className="max-w-[120px] truncate text-primary hover:underline" onClick={() => handlePreview(attachment)} title={attachment.original_name}>
                              {attachment.original_name}
                            </button>
                            <Button variant="ghost" size="icon-xs" title="预览" aria-label="预览附件" onClick={() => handlePreview(attachment)}><Eye className="size-3" /></Button>
                          </div>
                        )) : <span className="text-xs text-text-secondary">无附件</span>}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px] text-text-secondary">
                      {payment.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" title="编辑" aria-label="编辑付款" onClick={() => openEditDialog(payment)}><Pencil className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogTitle>编辑付款期次</DialogTitle>
        </DialogContent>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">期次名称 *</label>
              <select
                className="w-full h-10 rounded-md border border-border bg-bg-card px-3 text-sm"
                value={editing.name || ""}
                onChange={(e) => setEditing((prev) => ({ ...prev, name: e.target.value }))}
              >
                <option value="">请选择期次名称</option>
                {PAYMENT_NAME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">付款比例</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={ratioInput}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    setRatioInput(rawValue);
                    const ratio = normalizeRatio(rawValue);
                    const amount = amountFromRatio(contractAmount, ratio);
                    setAmountInput(amount === undefined ? "" : amount.toFixed(2));
                  }}
                  onBlur={(e) => {
                    const ratio = normalizeRatio(e.target.value);
                    if (e.target.value !== "" && ratio === undefined) {
                      toast("付款比例必须为大于等于 0 的有效数值");
                      return;
                    }
                    setRatioInput(ratio === undefined ? "" : ratio.toFixed(2));
                    const amount = amountFromRatio(contractAmount, ratio);
                    setAmountInput((prev) => (amount === undefined ? prev : amount.toFixed(2)));
                  }}
                  placeholder={Number(contractAmount || 0) <= 0 ? "合同金额为空，无法按比例计算" : "如：30"}
                />
                <span className="text-sm text-text-secondary">%</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">金额</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setRatioInput("");
                }}
                onBlur={(e) => {
                  const amount = normalizeAmount(e.target.value);
                  if (e.target.value !== "" && amount === undefined) {
                    toast("金额必须为大于等于 0 的有效数值");
                    return;
                  }
                  setAmountInput(amount === undefined ? "" : amount.toFixed(2));
                }}
                placeholder="不填则待定，最多两位小数"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">币种</label>
              <Input value={editing.currency || "CNY"} onChange={(e) => setEditing((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} maxLength={8} />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">排序</label>
              <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing((prev) => ({ ...prev, sort_order: e.target.value ? Number(e.target.value) : 0 }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">验收日期</label>
              <Input type="date" value={editing.acceptance_date || ""} onChange={(e) => setEditing((prev) => ({ ...prev, acceptance_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">实际付款日期</label>
              <Input type="date" value={editing.actual_payment_date || ""} onChange={(e) => setEditing((prev) => ({ ...prev, actual_payment_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">状态</label>
            <select
              className="w-full h-10 rounded-md border border-border bg-bg-card px-3 text-sm"
              value={editing.status || "pending"}
              onChange={(e) => setEditing((prev) => ({ ...prev, status: e.target.value as ContractPayment['status'] }))}
            >
              {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">备注</label>
            <Textarea value={editing.notes || ""} onChange={(e) => setEditing((prev) => ({ ...prev, notes: e.target.value }))} placeholder="付款条件、发票要求等" rows={3} />
          </div>
          {editingPayment ? (
            <div className="rounded-md border border-border bg-bg-card p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-text-primary">付款附件</p>
                <Button variant="outline" size="sm" onClick={() => uploadRefs.current[editingPayment.id]?.click()}>
                  <Upload className="size-3.5 mr-1" />上传PDF
                </Button>
              </div>
              <input
                ref={(el) => { uploadRefs.current[editingPayment.id] = el; }}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  handleUpload(editingPayment.id, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {editingPayment.attachments?.length ? (
                <div className="space-y-2">
                  {editingPayment.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 text-sm">
                      <FileText className="size-4 text-destructive" />
                      <button className="flex-1 truncate text-left text-primary hover:underline" onClick={() => handlePreview(attachment)} title={attachment.original_name}>
                        {attachment.original_name}
                      </button>
                      <Button variant="ghost" size="icon-xs" title="预览" aria-label="预览附件" onClick={() => handlePreview(attachment)}><Eye className="size-3" /></Button>
                      <Button variant="ghost" size="icon-xs" title="删除附件" aria-label="删除附件" onClick={() => handleDeleteAttachment(attachment)}><Trash2 className="size-3 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary">暂无附件</p>
              )}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting || !editing.name?.trim()}>{submitting ? "保存中..." : "保存"}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={(open) => open ? setPreviewOpen(true) : closePreview()}>
        <DialogContent onClose={closePreview}>
          <DialogTitle className="flex items-center gap-2"><Paperclip className="size-4" />{previewTitle}</DialogTitle>
        </DialogContent>
        <DialogBody className="p-0">
          {previewUrl ? <iframe src={previewUrl} className="h-[75vh] w-full rounded-b-card" title={previewTitle} /> : null}
        </DialogBody>
      </Dialog>
    </Card>
  );
}

function SummaryItem({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${warning ? "border-warning/30 bg-warning/10" : "border-border bg-bg-card"}`}>
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className={`text-sm font-semibold ${warning ? "text-warning" : "text-text-primary"}`}>{value}</p>
    </div>
  );
}

