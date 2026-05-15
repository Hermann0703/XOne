"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractStore, type Contract } from "./store";
import { apiGet } from "@/lib/api/client";

const INITIAL_FORM: Partial<Contract> = {
  contract_no: "",
  contract_name: "",
  classification_id: undefined,
  supplier_id: undefined,
  amount: undefined,
  currency: "CNY",
  sign_date: "",
  start_date: "",
  end_date: "",
  requirement_no: "",
  subject_no: "",
  subject_name: "",
  procurement_no: "",
  contract_type_id: undefined as number | undefined,
  description: "",
  keywords: [],
  status: "draft",
  auto_renewal: false,
  renewal_remind_days: 7,
  timeline_template_id: undefined as number | undefined,
};

export default function ContractForm() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isEdit = !!id;

  const {
    classifications,
    suppliers,
    fetchContract,
    fetchClassifications,
    fetchSuppliers,
    payments,
    fetchPayments,
    createContract,
    updateContract,
    bulkCreatePayments,
  } = useContractStore();

  const [form, setForm] = useState<Partial<Contract>>({ ...INITIAL_FORM });
  const [paymentTemplate, setPaymentTemplate] = useState<"" | "two" | "three">("");
  const [originalPaymentTemplate, setOriginalPaymentTemplate] = useState<"" | "two" | "three">("");
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [contractTypes, setContractTypes] = useState<{ id: number; code: string; name: string }[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [timelineTemplates, setTimelineTemplates] = useState<{ id: number; name: string }[]>([]);

  // 加载合同类型
  useEffect(() => {
    apiGet<{ id: number; name: string; code: string }[]>("/work/contracts/contract-types", { include_inactive: "true" })
      .then((res) => {
        if (res.code === 0 && res.data) {
          setContractTypes(res.data.map((item: any) => ({ id: item.id, code: item.code, name: item.name })));
        }
      })
      .finally(() => setLoadingTypes(false));
  }, []);

  // 加载时间轴模板
  useEffect(() => {
    apiGet<any>("/work/contracts/timeline-templates")
      .then((res) => {
        if (res.code === 0 && res.data) {
          setTimelineTemplates(res.data.map((t: any) => ({ id: t.id, name: t.name })));
        }
      });
  }, []);

  // 加载基础数据
  useEffect(() => {
    fetchClassifications();
    fetchSuppliers();
  }, [fetchClassifications, fetchSuppliers]);

  // 编辑模式下加载合同
  useEffect(() => {
    if (isEdit && id) {
      setLoadingContract(true);
      fetchContract(Number(id)).then((c) => {
        if (c) {
          setForm({
            contract_no: c.contract_no,
            contract_name: c.contract_name,
            classification_id: c.classification_id,
            supplier_id: c.supplier_id || undefined,
            amount: c.amount,
            currency: c.currency || "CNY",
            sign_date: c.sign_date || "",
            start_date: c.start_date || "",
            end_date: c.end_date || "",
            requirement_no: c.requirement_no || "",
            subject_no: c.subject_no || "",
            subject_name: c.subject_name || "",
            procurement_no: c.procurement_no || "",
            contract_type_id: c.contract_type_id || undefined,
            description: c.description || "",
            keywords: c.keywords || [],
            auto_renewal: c.auto_renewal ?? false,
            renewal_remind_days: c.renewal_remind_days ?? 7,
            timeline_template_id: c.timeline_template_id || undefined,
            status: c.status,
          });
        }
        setLoadingContract(false);
      });
    }
  }, [isEdit, id, fetchContract]);

  const inferPaymentTemplate = useCallback((items: typeof payments): "" | "two" | "three" => {
    const names = items
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .map((p) => p.name);
    if (names.length === 2 && names[0] === "首付款" && names[1] === "尾款") return "two";
    if (names.length === 3 && names[0] === "首付款" && names[1] === "进度款" && names[2] === "尾款") return "three";
    return "";
  }, []);

  // 编辑模式下从已有付款期次推断模板，用于回显；避免保存未变更合同再次追加模板步骤
  useEffect(() => {
    if (!isEdit || !id) return;
    setPaymentsLoaded(false);
    fetchPayments(Number(id)).finally(() => setPaymentsLoaded(true));
  }, [isEdit, id, fetchPayments]);

  useEffect(() => {
    if (!isEdit || !paymentsLoaded) return;
    const inferred = inferPaymentTemplate(payments);
    setPaymentTemplate(inferred);
    setOriginalPaymentTemplate(inferred);
  }, [isEdit, paymentsLoaded, payments, inferPaymentTemplate]);

  const setField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.contract_no?.trim()) errors.contract_no = "请输入合同编号";
    if (!form.contract_name?.trim()) errors.contract_name = "请输入合同名称";
    if (!form.classification_id) errors.classification_id = "请选择密级";
    if (form.amount == null || form.amount === undefined) errors.amount = "请输入采购金额";
    else if (Number.isNaN(form.amount) || Number(form.amount) <= 0) errors.amount = "请输入有效的采购金额（需大于0）";
    // keywords 序列化后最大长度 512
    if ((form.keywords || []).join(',').length > 512) errors.keywords = "关键词总长度不能超过512字符";
    // 编码字段正则校验: 大写/小写字母+数字开头，后续可用 '-' 分隔，不允许开头/结尾/连续 '-'
    // 后端: ^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$，长度 1-32
    const codePattern = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;
    const codeMaxLen = 32;
    if (form.requirement_no && (!codePattern.test(form.requirement_no) || form.requirement_no.length > codeMaxLen))
      errors.requirement_no = "仅允许字母、数字和 '-'，不允许开头/结尾/连续 '-'，最长 32 字符";
    if (form.subject_no && (!codePattern.test(form.subject_no) || form.subject_no.length > codeMaxLen))
      errors.subject_no = "仅允许字母、数字和 '-'，不允许开头/结尾/连续 '-'，最长 32 字符";
    if (form.procurement_no && (!codePattern.test(form.procurement_no) || form.procurement_no.length > codeMaxLen))
      errors.procurement_no = "仅允许字母、数字和 '-'，不允许开头/结尾/连续 '-'，最长 32 字符";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !(form.keywords || []).includes(kw)) {
      setForm((prev) => ({ ...prev, keywords: [...(prev.keywords || []), kw] }));
    }
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setForm((prev) => ({ ...prev, keywords: (prev.keywords || []).filter((k) => k !== kw) }));
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    setSubmitting(true);
    try {
      // keywords 序列化为逗号分隔字符串后 as any（API 接口接收字符串，类型定义使用 string[]）
      const raw = {
        ...form,
        keywords: form.keywords?.length ? form.keywords.join(",") : undefined,
      };
      // 剥离空字符串 → undefined，避免后端 Pydantic 对 Optional[date]/pattern 字段报 422
      const data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw)) {
        data[k] = v === "" ? undefined : v;
      }
      let result: Contract | null;
      if (isEdit && id) {
        result = await updateContract(Number(id), data as Partial<Contract>);
      } else {
        result = await createContract(data as Partial<Contract>);
      }
      if (result) {
        const shouldGeneratePayments = paymentTemplate && (!isEdit || paymentTemplate !== originalPaymentTemplate);
        if (shouldGeneratePayments) {
          try {
            const payments = await bulkCreatePayments(result.id, paymentTemplate);
            if (!payments) {
              toast("合同已保存，但付款计划模板生成失败");
            }
          } catch {
            toast("合同已保存，但付款计划模板生成失败");
          }
        }
        router.push(`/work/contracts/${result.id}`);
      } else {
        // 优先显示后端返回的错误消息
        const storeError = useContractStore.getState().error;
        toast(storeError || "保存失败，请检查必填字段是否填写完整");
      }
    } catch (e: unknown) {
      toast("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">
            {isEdit ? "编辑合同" : "新建合同"}
          </h1>
        </div>
        <Button onClick={handleSubmit} disabled={submitting || loadingContract}>
          <Save className="size-4 mr-1" />
          {submitting ? "保存中..." : "保存"}
        </Button>
      </div>

      {/* 编辑模式加载骨架屏 */}
      {isEdit && loadingContract ? (
        <div className="space-y-6">
          <Skeleton className="h-44 w-full rounded-card" />
          <Skeleton className="h-36 w-full rounded-card" />
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-36 w-full rounded-card" />
        </div>
      ) : (
        <>
          {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ──── 左列 ──── */}
          <div>
            <label htmlFor="field-contract-no" className="text-sm font-medium text-text-secondary block mb-1">
              合同编号 <span className="text-destructive">*</span>
            </label>
            <Input id="field-contract-no" value={form.contract_no || ""} onChange={(e) => setField("contract_no", e.target.value)} placeholder="请输入合同编号" />
            {fieldErrors.contract_no && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.contract_no}</p>
            )}
          </div>
          {/* ──── 右列 ──── */}
          <div>
            <label htmlFor="field-contract-name" className="text-sm font-medium text-text-secondary block mb-1">
              合同名称 <span className="text-destructive">*</span>
            </label>
            <Input id="field-contract-name" value={form.contract_name || ""} onChange={(e) => setField("contract_name", e.target.value)} placeholder="请输入合同名称" />
            {fieldErrors.contract_name && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.contract_name}</p>
            )}
          </div>
          <div>
            <label htmlFor="field-req-no" className="text-sm font-medium text-text-secondary block mb-1">需求编号</label>
            <Input id="field-req-no" value={form.requirement_no || ""} onChange={(e) => setField("requirement_no", e.target.value)} placeholder="字母+数字+'-'" />
            {fieldErrors.requirement_no && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.requirement_no}</p>
            )}
          </div>
          <div>
            <label htmlFor="field-subject-name" className="text-sm font-medium text-text-secondary block mb-1">标的名称</label>
            <Input id="field-subject-name" value={form.subject_name || ""} onChange={(e) => setField("subject_name", e.target.value)} placeholder="请输入标的名称" />
          </div>
          <div>
            <label htmlFor="field-subject-no" className="text-sm font-medium text-text-secondary block mb-1">标的编号</label>
            <Input id="field-subject-no" value={form.subject_no || ""} onChange={(e) => setField("subject_no", e.target.value)} placeholder="字母+数字+'-'" />
            {fieldErrors.subject_no && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.subject_no}</p>
            )}
          </div>
          <div>
            <label htmlFor="field-contract-type" className="text-sm font-medium text-text-secondary block mb-1">合同类型</label>
            <Select
              id="field-contract-type"
              options={contractTypes.map((t) => ({ value: String(t.id), label: t.name }))}
              value={form.contract_type_id ? String(form.contract_type_id) : ""}
              onChange={(e) => setField("contract_type_id", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="选择类型"
              disabled={loadingTypes}
            />
          </div>
          <div>
            <label htmlFor="field-proc-no" className="text-sm font-medium text-text-secondary block mb-1">采购记录编号</label>
            <Input id="field-proc-no" value={form.procurement_no || ""} onChange={(e) => setField("procurement_no", e.target.value)} placeholder="字母+数字+'-'" />
            {fieldErrors.procurement_no && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.procurement_no}</p>
            )}
          </div>
          <div>
            <label htmlFor="field-contract-classification" className="text-sm font-medium text-text-secondary block mb-1">密级 <span className="text-destructive">*</span></label>
            <Select
              id="field-contract-classification"
              options={classifications.map(c => ({ value: String(c.id), label: c.name }))}
              value={form.classification_id ? String(form.classification_id) : ""}
              onChange={(e) => setField("classification_id", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="选择密级"
            />
            {fieldErrors.classification_id && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.classification_id}</p>
            )}
          </div>
          <div>
            <label htmlFor="field-timeline-template" className="text-sm font-medium text-text-secondary block mb-1">时间轴模板</label>
            <Select
              id="field-timeline-template"
              options={[{ value: "", label: "-- 不使用模板 --" }, ...timelineTemplates.map((t: any) => ({ value: String(t.id), label: t.name }))]}
              value={form.timeline_template_id ? String(form.timeline_template_id) : ""}
              onChange={(e) => setField("timeline_template_id", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="选择时间轴模板"
            />
          </div>
          <div>
            <label htmlFor="field-payment-template" className="text-sm font-medium text-text-secondary block mb-1">付款计划模板</label>
            <Select
              id="field-payment-template"
              options={[
                { value: "", label: "-- 不使用模板 --" },
                { value: "two", label: "两期付款模板" },
                { value: "three", label: "三期付款模板" },
              ]}
              value={paymentTemplate}
              onChange={(e) => setPaymentTemplate(e.target.value as "" | "two" | "three")}
              placeholder="选择付款计划模板"
            />
          </div>
        </CardContent>
      </Card>

      {/* 签约方信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">签约方信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="field-contract-supplier" className="text-sm font-medium text-text-secondary block mb-1">供应商</label>
            <Select
              id="field-contract-supplier"
              options={suppliers.map(s => ({ value: s.id, label: s.name }))}
              value={form.supplier_id || ""}
              onChange={(e) => setField("supplier_id", e.target.value || undefined)}
              placeholder="选择供应商"
            />
          </div>
          <div>
            <label htmlFor="field-contract-amount" className="text-sm font-medium text-text-secondary block mb-1">采购金额 <span className="text-destructive">*</span></label>
            <Input id="field-contract-amount" type="number" required value={form.amount ?? ""} onChange={(e) => { const n = Number(e.target.value); setField("amount", e.target.value === "" || Number.isNaN(n) ? undefined : n); }} placeholder="请输入金额" />
            {fieldErrors.amount && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.amount}</p>
            )}
          </div>
          <div>
            <label htmlFor="field-contract-currency" className="text-sm font-medium text-text-secondary block mb-1">币种</label>
            <Select
              id="field-contract-currency"
              options={[
                { value: "CNY", label: "CNY (人民币)" },
                { value: "USD", label: "USD (美元)" },
                { value: "EUR", label: "EUR (欧元)" },
                { value: "JPY", label: "JPY (日元)" },
              ]}
              value={form.currency || "CNY"}
              onChange={(e) => setField("currency", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 日期信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">日期信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="field-contract-sign-date" className="text-sm font-medium text-text-secondary block mb-1">签署日期</label>
            <Input id="field-contract-sign-date" type="date" value={form.sign_date || ""} onChange={(e) => setField("sign_date", e.target.value)} />
          </div>
          <div>
            <label htmlFor="field-contract-start-date" className="text-sm font-medium text-text-secondary block mb-1">服务开始日期</label>
            <Input id="field-contract-start-date" type="date" value={form.start_date || ""} onChange={(e) => setField("start_date", e.target.value)} />
          </div>
          <div>
            <label htmlFor="field-contract-end-date" className="text-sm font-medium text-text-secondary block mb-1">服务结束日期</label>
            <Input id="field-contract-end-date" type="date" value={form.end_date || ""} onChange={(e) => setField("end_date", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* 描述与关键词 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">描述与关键词</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="field-contract-description" className="text-sm font-medium text-text-secondary block mb-1">合同描述</label>
            <Textarea id="field-contract-description" value={form.description || ""} onChange={(e) => setField("description", e.target.value)} placeholder="请输入合同描述" rows={3} />
          </div>
          <div>
            <label htmlFor="field-contract-keywords" className="text-sm font-medium text-text-secondary block mb-1">关键词</label>
            <div className="flex gap-2">
              <Input id="field-contract-keywords" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                placeholder="输入关键词后按回车添加" />
              <Button variant="outline" size="sm" onClick={addKeyword}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            {fieldErrors.keywords && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.keywords}</p>
            )}
            {(form.keywords || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.keywords || []).map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="inline-flex hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
