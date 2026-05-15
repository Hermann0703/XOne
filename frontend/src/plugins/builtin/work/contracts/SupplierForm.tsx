"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useContractStore, type Supplier, type SupplierContact, type SupplierBankAccount } from "./store";

const EMPTY_CONTACT: SupplierContact = { name: "", title: "", phone: "", landline: "", email: "" };
const EMPTY_BANK: SupplierBankAccount = { account_type: "", account_number: "", bank_name: "" };

const INITIAL_FORM: Partial<Supplier> = {
  name: "",
  short_name: "",
  english_name: "",
  legal_person: "",
  unified_social_credit_code: "",
  address: "",
  business_scope: "",
  contacts: [EMPTY_CONTACT],
  bank_accounts: [
    { account_type: "一般账户", account_number: "", bank_name: "" },
    { account_type: "数币账户", account_number: "", bank_name: "" },
  ],
  rating: "B",
  status: "active",
  notes: "",
};

export default function SupplierForm() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isEdit = !!id;

  const { createSupplier, updateSupplier, fetchSuppliers } = useContractStore();

  const [form, setForm] = useState<Partial<Supplier>>({ ...INITIAL_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 编辑模式下加载供应商数据
  useEffect(() => {
    if (isEdit && id) {
      setLoadingData(true);
      fetchSuppliers().then(() => {
        const store = useContractStore.getState();
        const found = store.suppliers.find((s) => s.id === id);
        if (found) {
          setForm({
            name: found.name,
            short_name: found.short_name,
            english_name: found.english_name,
            legal_person: found.legal_person,
            unified_social_credit_code: found.unified_social_credit_code,
            address: found.address,
            business_scope: found.business_scope,
            contacts: found.contacts?.length ? found.contacts : [EMPTY_CONTACT],
            bank_accounts: found.bank_accounts?.length
              ? found.bank_accounts
              : [
                  { account_type: "一般账户", account_number: "", bank_name: "" },
                  { account_type: "数币账户", account_number: "", bank_name: "" },
                ],
            rating: found.rating,
            status: found.status,
            notes: found.notes,
          });
        }
        setLoadingData(false);
      });
    }
  }, [isEdit, id, fetchSuppliers]);

  const setField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ── 联系人操作 ──
  const updateContact = (idx: number, field: keyof SupplierContact, value: string) => {
    const contacts = [...(form.contacts || [])];
    contacts[idx] = { ...contacts[idx], [field]: value };
    setField("contacts", contacts);
  };

  const addContact = () => {
    setField("contacts", [...(form.contacts || []), { ...EMPTY_CONTACT }]);
  };

  const removeContact = (idx: number) => {
    const contacts = [...(form.contacts || [])];
    contacts.splice(idx, 1);
    setField("contacts", contacts.length > 0 ? contacts : [EMPTY_CONTACT]);
  };

  // ── 银行账户操作 ──
  const updateBank = (idx: number, field: keyof SupplierBankAccount, value: string) => {
    const bank_accounts = [...(form.bank_accounts || [])];
    bank_accounts[idx] = { ...bank_accounts[idx], [field]: value };
    setField("bank_accounts", bank_accounts);
  };

  const addBank = () => {
    setField("bank_accounts", [...(form.bank_accounts || []), { ...EMPTY_BANK }]);
  };

  const removeBank = (idx: number) => {
    const bank_accounts = [...(form.bank_accounts || [])];
    bank_accounts.splice(idx, 1);
    setField("bank_accounts", bank_accounts.length > 0 ? bank_accounts : [EMPTY_BANK]);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = "请输入企业名称";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // 清理空的联系人/银行行（仅保留有内容的行）
      const payload = {
        ...form,
        contacts: (form.contacts || []).filter((c) => c.name || c.title || c.phone || c.landline || c.email),
        bank_accounts: (form.bank_accounts || []).filter((b) => b.account_number || b.bank_name),
      };
      if (isEdit && id) {
        const result = await updateSupplier(id, payload);
        if (!result) { toast("保存失败，请检查网络或重新登录"); return; }
        toast("供应商已更新");
      } else {
        const result = await createSupplier(payload);
        if (!result) { toast("创建失败，请检查网络或重新登录"); return; }
        toast("供应商已创建");
      }
      router.push("/work/contracts/suppliers");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "未知错误";
      toast(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const contacts = form.contacts || [EMPTY_CONTACT];
  const bankAccounts = form.bank_accounts || [
    { account_type: "一般账户", account_number: "", bank_name: "" },
    { account_type: "数币账户", account_number: "", bank_name: "" },
  ];

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">
            {isEdit ? "编辑供应商" : "新建供应商"}
          </h1>
        </div>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 mr-1 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="size-4 mr-1" />
              {isEdit ? "更新" : "创建"}
            </>
          )}
        </Button>
      </div>

      {/* 供应商信息卡片 — 含基本字段 + 经营范围 + 评级/状态 */}
      <Card className="shadow-none border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">供应商信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 左右两列：6 个输入字段，统一 gap-y-4 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* 左列 */}
            <div>
              <label htmlFor="field-sup-name" className="text-sm font-medium text-text-secondary block mb-1.5">
                企业名称 <span className="text-destructive">*</span>
              </label>
              <Input id="field-sup-name" value={form.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="请输入企业名称" />
              {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="field-sup-legal-person" className="text-sm font-medium text-text-secondary block mb-1.5">法人</label>
              <Input id="field-sup-legal-person" value={form.legal_person || ""} onChange={(e) => setField("legal_person", e.target.value)} placeholder="法人姓名" />
            </div>
            {/* 第2行 */}
            <div>
              <label htmlFor="field-sup-short-name" className="text-sm font-medium text-text-secondary block mb-1.5">企业简称</label>
              <Input id="field-sup-short-name" value={form.short_name || ""} onChange={(e) => setField("short_name", e.target.value)} placeholder="请输入企业简称" />
            </div>
            <div>
              <label htmlFor="field-sup-credit-code" className="text-sm font-medium text-text-secondary block mb-1.5">统一社会信用代码</label>
              <Input id="field-sup-credit-code" value={form.unified_social_credit_code || ""} onChange={(e) => setField("unified_social_credit_code", e.target.value)} placeholder="18位统一社会信用代码" />
            </div>
            {/* 第3行 */}
            <div>
              <label htmlFor="field-sup-english-name" className="text-sm font-medium text-text-secondary block mb-1.5">英文名称</label>
              <Input id="field-sup-english-name" value={form.english_name || ""} onChange={(e) => setField("english_name", e.target.value)} placeholder="请输入英文名称" />
            </div>
            <div>
              <label htmlFor="field-sup-address" className="text-sm font-medium text-text-secondary block mb-1.5">注册地址</label>
              <Input id="field-sup-address" value={form.address || ""} onChange={(e) => setField("address", e.target.value)} placeholder="请输入注册地址" />
            </div>
          </div>
          {/* 经营范围 — 全宽 */}
          <div>
            <label htmlFor="field-sup-scope" className="text-sm font-medium text-text-secondary block mb-1.5">经营范围</label>
            <Textarea id="field-sup-scope" value={form.business_scope || ""} onChange={(e) => setField("business_scope", e.target.value)} placeholder="请输入经营范围" rows={3} />
          </div>
          {/* 评级与状态 — 内嵌分隔线 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-border/30">
            <div>
              <label htmlFor="field-sup-rating" className="text-sm font-medium text-text-secondary block mb-1.5">评级</label>
              <Select id="field-sup-rating" options={[{ value: "A", label: "A 级" }, { value: "B", label: "B 级" }, { value: "C", label: "C 级" }, { value: "D", label: "D 级" }]} value={form.rating || "B"} onChange={(e) => setField("rating", e.target.value)} />
            </div>
            <div>
              <label htmlFor="field-sup-status" className="text-sm font-medium text-text-secondary block mb-1.5">状态</label>
              <Select id="field-sup-status" options={[{ value: "active", label: "启用" }, { value: "inactive", label: "停用" }, { value: "blacklisted", label: "黑名单" }]} value={form.status || "active"} onChange={(e) => setField("status", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* 联系人卡片 — 数据列表模式 */}
      <Card className="shadow-none border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">联系人</CardTitle>
          <Button variant="outline" size="sm" onClick={addContact}>
            <Plus className="size-3 mr-1" /> 新增
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 表头 */}
          <div className="grid grid-cols-[1fr_100px_1fr_120px_1fr_36px] gap-2 text-xs text-text-tertiary font-medium px-1">
            <span>姓名</span>
            <span>职务</span>
            <span>手机号</span>
            <span>固话</span>
            <span>邮箱</span>
            <span></span>
          </div>
          {contacts.map((c, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_100px_1fr_120px_1fr_36px] gap-2 items-start">
              <Input
                value={c.name}
                onChange={(e) => updateContact(idx, "name", e.target.value)}
                placeholder="姓名"
                className="h-9"
              />
              <Input
                value={c.title}
                onChange={(e) => updateContact(idx, "title", e.target.value)}
                placeholder="职务"
                className="h-9"
              />
              <Input
                value={c.phone}
                onChange={(e) => updateContact(idx, "phone", e.target.value)}
                placeholder="手机号"
                className="h-9"
              />
              <Input
                value={c.landline}
                onChange={(e) => updateContact(idx, "landline", e.target.value)}
                placeholder="固话"
                className="h-9"
              />
              <Input
                value={c.email}
                onChange={(e) => updateContact(idx, "email", e.target.value)}
                placeholder="邮箱"
                className="h-9"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:text-destructive"
                onClick={() => removeContact(idx)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 银行信息卡片 — 数据列表模式 */}
      <Card className="shadow-none border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">银行信息</CardTitle>
          <Button variant="outline" size="sm" onClick={addBank}>
            <Plus className="size-3 mr-1" /> 新增
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 表头 */}
          <div className="grid grid-cols-[140px_1fr_1fr_36px] gap-2 text-xs text-text-tertiary font-medium px-1">
            <span>账户类型</span>
            <span>账户号</span>
            <span>开户行</span>
            <span></span>
          </div>
          {bankAccounts.map((b, idx) => (
            <div key={idx} className="grid grid-cols-[140px_1fr_1fr_36px] gap-2 items-start">
              <Input
                value={b.account_type}
                onChange={(e) => updateBank(idx, "account_type", e.target.value)}
                placeholder="账户类型"
                className="h-9"
              />
              <Input
                value={b.account_number}
                onChange={(e) => updateBank(idx, "account_number", e.target.value)}
                placeholder="账户号"
                className="h-9"
              />
              <Input
                value={b.bank_name}
                onChange={(e) => updateBank(idx, "bank_name", e.target.value)}
                placeholder="开户行"
                className="h-9"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:text-destructive"
                onClick={() => removeBank(idx)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 备注 */}
      <Card className="shadow-none border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">备注</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="field-sup-notes"
            value={form.notes || ""}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="备注信息"
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
