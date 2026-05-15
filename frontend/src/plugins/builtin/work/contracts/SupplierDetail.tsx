"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiDelete } from "@/lib/api/client";
import type { Supplier, SupplierContact, SupplierBankAccount } from "./store";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "启用", className: "bg-green-100 text-green-700 border-green-300" },
  inactive: { label: "停用", className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600" },
  blacklisted: { label: "黑名单", className: "bg-red-100 text-red-700 border-red-300" },
};

const RATING_LABELS: Record<string, string> = {
  A: "A 级",
  B: "B 级",
  C: "C 级",
  D: "D 级",
};

export default function SupplierDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      apiGet<Supplier>(`/work/contracts/suppliers/${id}`)
        .then((res) => {
          if (res.code === 0) setSupplier(res.data);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    );
  }

  const s = supplier;
  if (!s) {
    return (
      <div className="p-6 text-center text-text-secondary">供应商不存在或已被删除</div>
    );
  }

  const handleDelete = async () => {
    if (!confirm(`确定要删除供应商「${s.name}」吗？此操作不可撤销。`)) return;
    const res = await apiDelete(`/work/contracts/suppliers/${s.id}`);
    if (res.code === 0) router.push("/work/contracts/suppliers");
  };

  const statusConfig = STATUS_MAP[s.status || ""] || STATUS_MAP.inactive;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm text-text-secondary">
        <button
          onClick={() => router.push("/work/contracts/suppliers")}
          className="hover:text-text-primary transition-colors"
        >
          供应商管理
        </button>
        <span>/</span>
        <span className="text-text-primary font-medium">供应商详情</span>
      </nav>

      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">{s.name}</h1>
          <Badge
            variant="outline"
            className={`inline-flex items-center gap-1 ${statusConfig.className}`}
          >
            <span
              className={`size-1.5 rounded-full ${
                s.status === "active"
                  ? "bg-success"
                  : s.status === "blacklisted"
                  ? "bg-destructive"
                  : "bg-text-tertiary"
              }`}
            />
            {statusConfig.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/work/contracts/suppliers/${s.id}/edit`)}>
            <Pencil className="size-4 mr-1" />编辑
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="size-4 mr-1" />删除
          </Button>
        </div>
      </div>

      {/* 供应商信息 — 统一网格 */}
      <Card className="shadow-none border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">供应商信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 6 字段 → 3行2列网格，统一 gap */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <InfoItem label="企业名称" value={s.name} />
            <InfoItem label="法人" value={s.legal_person} />
            <InfoItem label="企业简称" value={s.short_name} />
            <InfoItem label="统一社会信用代码" value={s.unified_social_credit_code} />
            <InfoItem label="英文名称" value={s.english_name} />
            <InfoItem label="注册地址" value={s.address} />
          </div>
          {/* 经营范围 — 全宽 */}
          <InfoItem label="经营范围" value={s.business_scope} />
          {/* 评级与状态 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm pt-4 border-t border-border/30">
            <InfoItem label="评级" value={s.rating ? RATING_LABELS[s.rating] || s.rating : undefined} />
            <InfoItem label="状态" value={statusConfig.label} />
          </div>
        </CardContent>
      </Card>

      {/* 联系人 */}
      {s.contacts && s.contacts.length > 0 && (
        <Card className="shadow-none border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">联系人</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-tertiary border-b border-border/50">
                  <th className="text-left font-medium pb-2 pl-2">姓名</th>
                  <th className="text-left font-medium pb-2">职务</th>
                  <th className="text-left font-medium pb-2">手机号</th>
                  <th className="text-left font-medium pb-2">固话</th>
                  <th className="text-left font-medium pb-2 pr-2">邮箱</th>
                </tr>
              </thead>
              <tbody>
                {s.contacts.map((c: SupplierContact, idx: number) => (
                  <tr
                    key={idx}
                    className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2.5 pl-2 font-medium">{c.name || "-"}</td>
                    <td className="py-2.5">{c.title || "-"}</td>
                    <td className="py-2.5 font-mono text-sm">{c.phone || "-"}</td>
                    <td className="py-2.5">{c.landline || "-"}</td>
                    <td className="py-2.5 pr-2">{c.email || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 银行信息 */}
      {s.bank_accounts && s.bank_accounts.length > 0 && (
        <Card className="shadow-none border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">银行信息</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-tertiary border-b border-border/50">
                  <th className="text-left font-medium pb-2 pl-2">账户类型</th>
                  <th className="text-left font-medium pb-2">账户号</th>
                  <th className="text-left font-medium pb-2 pr-2">开户行</th>
                </tr>
              </thead>
              <tbody>
                {s.bank_accounts.map((b: SupplierBankAccount, idx: number) => (
                  <tr
                    key={idx}
                    className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2.5 pl-2 font-medium">{b.account_type || "-"}</td>
                    <td className="py-2.5 font-mono text-sm">{b.account_number || "-"}</td>
                    <td className="py-2.5 pr-2">{b.bank_name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 备注 */}
      {s.notes && (
        <Card className="shadow-none border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">备注</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{s.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className="text-sm font-medium min-h-[1.25rem]">{value || "-"}</p>
    </div>
  );
}
