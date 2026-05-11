"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, X, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractStore, type Contract } from "./store";

const INITIAL_FORM: Partial<Contract> = {
  contract_no: "",
  contract_name: "",
  fonds_id: undefined,
  category_id: undefined,
  classification_id: undefined,
  buyer: "",
  supplier: "",
  amount: undefined,
  currency: "CNY",
  sign_date: "",
  start_date: "",
  end_date: "",
  requirement_no: "",
  subject_no: "",
  subject_name: "",
  procurement_no: "",
  contract_type: "",
  description: "",
  keywords: [],
  status: "draft",
};

export default function ContractForm() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isEdit = !!id;

  const {
    selectedContract,
    fonds,
    categories,
    classifications,
    fetchContract,
    fetchFonds,
    fetchCategories,
    fetchClassifications,
    createContract,
    updateContract,
  } = useContractStore();

  const [form, setForm] = useState<Partial<Contract>>({ ...INITIAL_FORM });
  const [keywordInput, setKeywordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 加载基础数据
  useEffect(() => {
    fetchFonds();
    fetchCategories();
    fetchClassifications();
  }, [fetchFonds, fetchCategories, fetchClassifications]);

  // 编辑模式下加载合同
  useEffect(() => {
    if (isEdit && id) {
      setLoadingContract(true);
      fetchContract(Number(id)).then((c) => {
        if (c) {
          setForm({
            contract_no: c.contract_no,
            contract_name: c.contract_name,
            fonds_id: c.fonds_id,
            category_id: c.category_id,
            classification_id: c.classification_id,
            buyer: c.buyer || "",
            supplier: c.supplier || "",
            amount: c.amount,
            currency: c.currency || "CNY",
            sign_date: c.sign_date || "",
            start_date: c.start_date || "",
            end_date: c.end_date || "",
            requirement_no: c.requirement_no || "",
            subject_no: c.subject_no || "",
            subject_name: c.subject_name || "",
            procurement_no: c.procurement_no || "",
            contract_type: c.contract_type || "",
            description: c.description || "",
            keywords: c.keywords || [],
            status: c.status,
          });
        }
        setLoadingContract(false);
      });
    }
  }, [isEdit, id, fetchContract]);

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
    // 编码字段正则校验: 仅允许字母+数字+'-'，最长32字符
    const codePattern = /^[a-zA-Z0-9-]{0,32}$/;
    if (form.requirement_no && !codePattern.test(form.requirement_no))
      errors.requirement_no = "仅允许字母、数字和 '-'，最长 32 字符";
    if (form.subject_no && !codePattern.test(form.subject_no))
      errors.subject_no = "仅允许字母、数字和 '-'，最长 32 字符";
    if (form.procurement_no && !codePattern.test(form.procurement_no))
      errors.procurement_no = "仅允许字母、数字和 '-'，最长 32 字符";
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
    if (!validate()) return;
    setSubmitting(true);
    let result: Contract | null;
    if (isEdit && id) {
      result = await updateContract(Number(id), form);
    } else {
      result = await createContract(form);
    }
    setSubmitting(false);
    if (result) {
      router.push(`/work/contracts/${result.id}`);
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
          <div>
            <label htmlFor="field-contract-no" className="text-sm font-medium text-text-secondary block mb-1">
              合同编号 <span className="text-destructive">*</span>
            </label>
            <Input id="field-contract-no" value={form.contract_no || ""} onChange={(e) => setField("contract_no", e.target.value)} placeholder="请输入合同编号" />
            {fieldErrors.contract_no && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.contract_no}</p>
            )}
          </div>
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
            <label htmlFor="field-subject-no" className="text-sm font-medium text-text-secondary block mb-1">标的编号</label>
            <Input id="field-subject-no" value={form.subject_no || ""} onChange={(e) => setField("subject_no", e.target.value)} placeholder="字母+数字+'-'" />
            {fieldErrors.subject_no && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.subject_no}</p>
            )}
          </div>
          <div>
            <label htmlFor="field-subject-name" className="text-sm font-medium text-text-secondary block mb-1">标的名称</label>
            <Input id="field-subject-name" value={form.subject_name || ""} onChange={(e) => setField("subject_name", e.target.value)} placeholder="请输入标的名称" />
          </div>
          <div>
            <label htmlFor="field-proc-no" className="text-sm font-medium text-text-secondary block mb-1">采购记录编号</label>
            <Input id="field-proc-no" value={form.procurement_no || ""} onChange={(e) => setField("procurement_no", e.target.value)} placeholder="字母+数字+'-'" />
            {fieldErrors.procurement_no && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.procurement_no}</p>
            )}
          </div>
          <div>
            <label htmlFor="field-contract-fonds" className="text-sm font-medium text-text-secondary block mb-1">全宗</label>
            <Select
              id="field-contract-fonds"
              options={fonds.map(f => ({ value: String(f.id), label: f.name }))}
              value={form.fonds_id ? String(form.fonds_id) : ""}
              onChange={(e) => setField("fonds_id", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="选择全宗"
            />
          </div>
          <div>
            <label htmlFor="field-contract-category" className="text-sm font-medium text-text-secondary block mb-1">分类</label>
            <Select
              id="field-contract-category"
              options={categories.map(c => ({ value: String(c.id), label: c.name }))}
              value={form.category_id ? String(form.category_id) : ""}
              onChange={(e) => setField("category_id", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="选择分类"
            />
          </div>
          <div>
            <label htmlFor="field-contract-classification" className="text-sm font-medium text-text-secondary block mb-1">密级</label>
            <Select
              id="field-contract-classification"
              options={classifications.map(c => ({ value: String(c.id), label: c.name }))}
              value={form.classification_id ? String(form.classification_id) : ""}
              onChange={(e) => setField("classification_id", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="选择密级"
            />
          </div>
          <div>
            <label htmlFor="field-contract-type" className="text-sm font-medium text-text-secondary block mb-1">合同类型</label>
            <Select
              id="field-contract-type"
              options={[
                { value: "purchase", label: "采购合同" },
                { value: "sale", label: "销售合同" },
                { value: "service", label: "服务合同" },
                { value: "lease", label: "租赁合同" },
                { value: "other", label: "其他" },
              ]}
              value={form.contract_type || ""}
              onChange={(e) => setField("contract_type", e.target.value || undefined)}
              placeholder="选择类型"
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
            <label htmlFor="field-contract-buyer" className="text-sm font-medium text-text-secondary block mb-1">采购方</label>
            <Input id="field-contract-buyer" value={form.buyer || ""} onChange={(e) => setField("buyer", e.target.value)} placeholder="请输入采购方名称" />
          </div>
          <div>
            <label htmlFor="field-contract-supplier" className="text-sm font-medium text-text-secondary block mb-1">供应商</label>
            <Input id="field-contract-supplier" value={form.supplier || ""} onChange={(e) => setField("supplier", e.target.value)} placeholder="请输入供应商名称" />
          </div>
          <div>
            <label htmlFor="field-contract-amount" className="text-sm font-medium text-text-secondary block mb-1">采购金额</label>
            <Input id="field-contract-amount" type="number" value={form.amount ?? ""} onChange={(e) => setField("amount", e.target.value ? Number(e.target.value) : undefined)} placeholder="请输入金额" />
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
