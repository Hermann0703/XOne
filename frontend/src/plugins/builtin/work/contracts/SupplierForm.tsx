"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useContractStore, type Supplier } from "./store";

const INITIAL_FORM: Partial<Supplier> = {
  name: "",
  contact_person: "",
  contact_phone: "",
  address: "",
  business_license: "",
  tax_id: "",
  bank_name: "",
  bank_account: "",
  dc_bank_name: "",
  dc_bank_account: "",
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
        // 从 store 中获取已缓存的列表，找到对应供应商
        const store = useContractStore.getState();
        const found = store.suppliers.find((s) => s.id === id);
        if (found) {
          setForm({
            name: found.name,
            contact_person: found.contact_person,
            contact_phone: found.contact_phone,
            address: found.address,
            business_license: found.business_license,
            tax_id: found.tax_id,
            bank_name: found.bank_name,
            bank_account: found.bank_account,
            dc_bank_name: found.dc_bank_name,
            dc_bank_account: found.dc_bank_account,
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

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = "请输入供应商名称";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isEdit && id) {
        const result = await updateSupplier(id, form);
        if (!result) { toast("保存失败，请检查网络或重新登录"); return; }
        toast("供应商已更新");
      } else {
        const result = await createSupplier(form);
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

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
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

      {/* 基本信息 */}
      <Card className="shadow-none border-border/50 hover:shadow-none hover:translate-y-0">
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="field-supplier-name"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              名称 <span className="text-destructive">*</span>
            </label>
            <Input
              id="field-supplier-name"
              value={form.name || ""}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="请输入供应商名称"
            />
            {fieldErrors.name && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="field-supplier-contact-person"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              联系人
            </label>
            <Input
              id="field-supplier-contact-person"
              value={form.contact_person || ""}
              onChange={(e) => setField("contact_person", e.target.value)}
              placeholder="联系人姓名"
            />
          </div>
          <div>
            <label
              htmlFor="field-supplier-contact-phone"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              电话
            </label>
            <Input
              id="field-supplier-contact-phone"
              value={form.contact_phone || ""}
              onChange={(e) => setField("contact_phone", e.target.value)}
              placeholder="联系电话"
            />
          </div>
          <div>
            <label
              htmlFor="field-supplier-address"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              地址
            </label>
            <Input
              id="field-supplier-address"
              value={form.address || ""}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="供应商地址"
            />
          </div>
        </CardContent>
      </Card>

      {/* 资质信息 */}
      <Card className="shadow-none border-border/50 hover:shadow-none hover:translate-y-0">
        <CardHeader>
          <CardTitle className="text-base">资质信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="field-supplier-business-license"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              营业执照号
            </label>
            <Input
              id="field-supplier-business-license"
              value={form.business_license || ""}
              onChange={(e) => setField("business_license", e.target.value)}
              placeholder="营业执照号"
            />
          </div>
          <div>
            <label
              htmlFor="field-supplier-tax-id"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              税号
            </label>
            <Input
              id="field-supplier-tax-id"
              value={form.tax_id || ""}
              onChange={(e) => setField("tax_id", e.target.value)}
              placeholder="纳税人识别号"
            />
          </div>
        </CardContent>
      </Card>

      {/* 银行信息 */}
      <Card className="shadow-none border-border/50 hover:shadow-none hover:translate-y-0">
        <CardHeader>
          <CardTitle className="text-base">银行信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="field-supplier-bank-name"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              开户行
            </label>
            <Input
              id="field-supplier-bank-name"
              value={form.bank_name || ""}
              onChange={(e) => setField("bank_name", e.target.value)}
              placeholder="开户银行名称"
            />
          </div>
          <div>
            <label
              htmlFor="field-supplier-bank-account"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              银行账号
            </label>
            <Input
              id="field-supplier-bank-account"
              value={form.bank_account || ""}
              onChange={(e) => setField("bank_account", e.target.value)}
              placeholder="银行账号"
            />
          </div>
          <div>
            <label
              htmlFor="field-supplier-dc-bank-name"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              数字人民币开户行
            </label>
            <Input
              id="field-supplier-dc-bank-name"
              value={form.dc_bank_name || ""}
              onChange={(e) => setField("dc_bank_name", e.target.value)}
              placeholder="数字人民币开户行名称"
            />
          </div>
          <div>
            <label
              htmlFor="field-supplier-dc-bank-account"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              数字人民币账号
            </label>
            <Input
              id="field-supplier-dc-bank-account"
              value={form.dc_bank_account || ""}
              onChange={(e) => setField("dc_bank_account", e.target.value)}
              placeholder="数字人民币钱包/账号"
            />
          </div>
        </CardContent>
      </Card>

      {/* 评级与状态 */}
      <Card className="shadow-none border-border/50 hover:shadow-none hover:translate-y-0">
        <CardHeader>
          <CardTitle className="text-base">评级与状态</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="field-supplier-rating"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              评级
            </label>
            <Select
              id="field-supplier-rating"
              options={[
                { value: "A", label: "A 级" },
                { value: "B", label: "B 级" },
                { value: "C", label: "C 级" },
                { value: "D", label: "D 级" },
              ]}
              value={form.rating || "B"}
              onChange={(e) => setField("rating", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="field-supplier-status"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              状态
            </label>
            <Select
              id="field-supplier-status"
              options={[
                { value: "active", label: "启用" },
                { value: "inactive", label: "停用" },
                { value: "blacklisted", label: "黑名单" },
              ]}
              value={form.status || "active"}
              onChange={(e) => setField("status", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 备注 */}
      <Card className="shadow-none border-border/50 hover:shadow-none hover:translate-y-0">
        <CardHeader>
          <CardTitle className="text-base">备注</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label
              htmlFor="field-supplier-notes"
              className="text-sm font-medium text-text-secondary block mb-1"
            >
              备注
            </label>
            <Textarea
              id="field-supplier-notes"
              value={form.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="备注信息"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
