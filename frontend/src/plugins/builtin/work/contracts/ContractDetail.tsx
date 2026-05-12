"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractStore } from "./store";
import dynamic from "next/dynamic";

const MilestoneTable = dynamic(() => import("./MilestoneTable"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

const Timeline = dynamic(() => import("./Timeline"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

const LifecyclePanel = dynamic(() => import("./LifecyclePanel"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft:      { label: "草稿",   className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600" },
  signed:     { label: "已签署", className: "bg-blue-100 text-blue-700 border-blue-300" },
  in_progress: { label: "履行中", className: "bg-green-100 text-green-700 border-green-300" },
  completed:  { label: "已完成", className: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  terminated: { label: "已终止", className: "bg-red-100 text-red-700 border-red-300" },
};

const TYPE_LABELS: Record<string, string> = {
  purchase: "采购合同",
  sale:     "销售合同",
  service:  "服务合同",
  lease:    "租赁合同",
  other:    "其他",
};

export default function ContractDetail() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id as string);
  const { selectedContract, fetchContract, deleteContract, fetchMilestones } = useContractStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("milestones");

  useEffect(() => {
    if (id) {
      fetchContract(id).then(() => setLoading(false));
      fetchMilestones(id);
    }
  }, [id, fetchContract, fetchMilestones]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-48 rounded-card" />
          </div>
          <Skeleton className="h-80 rounded-card" />
        </div>
      </div>
    );
  }

  const c = selectedContract;
  if (!c) {
    return (
      <div className="p-6 text-center text-text-secondary">合同不存在或已被删除</div>
    );
  }

  const statusConfig = STATUS_MAP[c.status] || STATUS_MAP.draft;

  const handleDelete = async () => {
    if (!confirm(`确定要删除合同「${c.contract_name}」吗？此操作不可撤销。`)) return;
    const ok = await deleteContract(c.id);
    if (ok) router.push("/work/contracts");
  };

  return (
    <div className="space-y-6 p-6">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm text-text-secondary">
        <button
          onClick={() => router.push("/work/contracts")}
          className="hover:text-text-primary transition-colors"
        >
          合同管理
        </button>
        <span>/</span>
        <span className="text-text-primary font-medium">合同详情</span>
      </nav>

      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">{c.contract_name}</h1>
          <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/work/contracts/${c.id}/edit`)}>
            <Pencil className="size-4 mr-1" />编辑
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="size-4 mr-1" />删除
          </Button>
        </div>
      </div>

      {/* 左右布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：合同信息 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <InfoItem label="合同编号" value={c.contract_no} />
                <InfoItem label="需求编号" value={c.requirement_no} />
                <InfoItem label="标的编号" value={c.subject_no} />
                <InfoItem label="标的名称" value={c.subject_name} />
                <InfoItem label="采购记录编号" value={c.procurement_no} />
                <InfoItem label="全宗" value={c.fonds_name} />
                <InfoItem label="分类" value={c.category_name} />
                <InfoItem label="密级" value={c.classification_name} />
                <InfoItem label="合同类型" value={c.contract_type ? TYPE_LABELS[c.contract_type] || c.contract_type : "-"} />
                <InfoItem label="状态" value={statusConfig.label} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">签约方与金额</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <InfoItem label="供应商" value={c.supplier} />
                <InfoItem label="采购金额" value={c.amount != null ? `${c.currency || "CNY"} ${c.amount.toLocaleString()}` : "-"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">日期信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <InfoItem label="签署日期" value={c.sign_date} />
                <InfoItem label="服务开始日期" value={c.start_date} />
                <InfoItem label="服务结束日期" value={c.end_date} />
              </div>
            </CardContent>
          </Card>

          {c.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">描述</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{c.description}</p>
              </CardContent>
            </Card>
          )}

          {c.keywords && c.keywords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">关键词</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {c.keywords.map((kw) => (
                    <Badge key={kw} variant="secondary">{kw}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 里程碑标签页 */}
          <Card>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="milestones">里程碑列表</TabsTrigger>
                  <TabsTrigger value="timeline-tab">时间轴</TabsTrigger>
                  <TabsTrigger value="lifecycle">生命周期</TabsTrigger>
                </TabsList>
                <TabsContent value="milestones">
                  <MilestoneTable contractId={c.id} />
                </TabsContent>
                <TabsContent value="timeline-tab">
                  <Timeline contract={c} />
                </TabsContent>
                <TabsContent value="lifecycle">
                  <LifecyclePanel contractId={c.id} lifecycleId={c.lifecycle_id} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：时间轴 */}
        <div className="lg:col-span-1">
          <Timeline contract={c} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-text-secondary mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}
