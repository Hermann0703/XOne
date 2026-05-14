"use client";

// 阶段类型创建/编辑表单（独立页面模式，也可作为弹窗复用）
// 通过查询参数 mode=create|edit 和 id 判断

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiGet, apiPost, apiPatch } from "@/lib/api/client";
import type { StageType } from "./StageTypeList";

// ─── 预设颜色 ────────────────────────────────────────

const PRESET_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
  "#A855F7", "#78716C", "#22D3EE", "#84CC16", "#E11D48",
];

const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "signed", label: "已签署" },
  { value: "in_progress", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "terminated", label: "已终止" },
];

// ─── 类型 ────────────────────────────────────────────

interface StageTypeFormData {
  name: string;
  code: string;
  color: string;
  default_status: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

const INITIAL_FORM: StageTypeFormData = {
  name: "",
  code: "",
  color: "#3B82F6",
  default_status: "draft",
  description: "",
  sort_order: 0,
  is_active: true,
};

// ─── 组件 ────────────────────────────────────────────

export default function StageTypeForm() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isEdit = !!id;

  const [form, setForm] = useState<StageTypeFormData>({ ...INITIAL_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [codeChecking, setCodeChecking] = useState(false);

  // 编辑时加载数据
  useEffect(() => {
    if (!id) return;
    setLoadingData(true);
    apiGet<StageType>(`/work/contracts/stage-types/${id}`)
      .then((res) => {
        if (res.code === 0 && res.data) {
          const d = res.data;
          setForm({
            name: d.name || "",
            code: d.code || "",
            color: d.color || "#3B82F6",
            default_status: d.default_status || "draft",
            description: d.description || "",
            sort_order: d.sort_order ?? 0,
            is_active: d.is_active ?? true,
          });
        } else {
          toast("加载数据失败");
          router.push("/work/catalog/stage-types");
        }
      })
      .catch(() => {
        toast("加载失败，请检查网络");
        router.push("/work/catalog/stage-types");
      })
      .finally(() => setLoadingData(false));
  }, [id, router]);

  // ─── 编码唯一性检查 ──────────────────────────────────

  const checkCodeUnique = async (code: string) => {
    if (!code.trim() || isEdit) return;
    setCodeChecking(true);
    try {
      const res = await apiGet<{ exists: boolean }>(
        "/work/contracts/stage-types/check-code",
        { code: code.trim() }
      );
      if (res.code === 0 && res.data?.exists) {
        setFormErrors((prev) => ({ ...prev, code: "编码已存在" }));
      }
    } catch {
      // 忽略检查错误
    } finally {
      setCodeChecking(false);
    }
  };

  // ─── 校验 ────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "请输入名称";
    if (!isEdit && !form.code.trim()) errors.code = "请输入编码";
    if (form.code && !/^[a-z_][a-z0-9_]*$/.test(form.code)) {
      errors.code = "编码格式不正确";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── 提交 ────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        color: form.color,
        default_status: form.default_status,
        description: form.description.trim() || undefined,
        sort_order: form.sort_order,
        is_active: form.is_active,
      };
      if (!isEdit) {
        payload.code = form.code.trim();
      }

      if (isEdit && id) {
        const res = await apiPatch<StageType>(
          `/work/contracts/stage-types/${id}`,
          payload
        );
        if (res.code === 0) {
          toast("阶段类型已更新");
          router.push("/work/catalog/stage-types");
        } else {
          toast(res.message || "更新失败");
        }
      } else {
        const res = await apiPost<StageType>(
          "/work/contracts/stage-types",
          payload
        );
        if (res.code === 0) {
          toast("阶段类型已创建");
          router.push("/work/catalog/stage-types");
        } else {
          if (res.message) {
            setFormErrors((prev) => ({ ...prev, code: res.message }));
          }
          toast(res.message || "创建失败");
        }
      }
    } catch {
      toast("操作失败，请检查网络");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 更新字段 ────────────────────────────────────

  const setField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ─── 渲染 ────────────────────────────────────────

  if (loadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-20">
          <span className="text-text-secondary">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit
              ? t("contracts.stageTypes.editType")
              : t("contracts.stageTypes.addType")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 名称 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.name")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="请输入阶段类型名称"
            />
            {formErrors.name && (
              <p className="text-xs text-destructive mt-1">
                {formErrors.name}
              </p>
            )}
          </div>

          {/* 编码 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.code")}{" "}
              {!isEdit && <span className="text-destructive">*</span>}
            </label>
            <Input
              value={form.code}
              onChange={(e) => {
                setField("code", e.target.value);
                // 即时校验唯一性（防抖略）
              }}
              onBlur={(e) => checkCodeUnique(e.target.value)}
              placeholder="例如：drafting"
              disabled={isEdit}
            />
            {formErrors.code && (
              <p className="text-xs text-destructive mt-1">
                {formErrors.code}
              </p>
            )}
            {codeChecking && (
              <p className="text-xs text-text-secondary mt-1">
                正在检查编码...
              </p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground mt-1">
                编码创建后不可修改
              </p>
            )}
          </div>

          {/* 颜色 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.color")}
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={form.color}
                onChange={(e) => setField("color", e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <span className="text-sm text-text-secondary">{form.color}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setField("color", c)}
                  className={`size-7 rounded-full border-2 transition-all ${
                    form.color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* 默认状态 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.defaultStatus")}
            </label>
            <Select
              options={STATUS_OPTIONS}
              value={form.default_status}
              onChange={(e) => setField("default_status", e.target.value)}
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.description")}
            </label>
            <Input
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="阶段类型描述（可选）"
            />
          </div>

          {/* 排序 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.sortOrder")}
            </label>
            <Input
              type="number"
              value={String(form.sort_order)}
              onChange={(e) =>
                setField("sort_order", Number(e.target.value) || 0)
              }
              placeholder="0"
            />
          </div>

          {/* 启用状态 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text-secondary">
              {t("contracts.stageTypes.status")}
            </label>
            <button
              type="button"
              onClick={() => setField("is_active", !form.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                form.is_active
                  ? "bg-primary"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                  form.is_active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-text-secondary">
              {form.is_active
                ? t("contracts.stageTypes.active")
                : t("contracts.stageTypes.inactive")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => router.push("/work/catalog/stage-types")}
        >
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            submitting ||
            !form.name.trim() ||
            (!isEdit && !form.code.trim())
          }
        >
          {submitting
            ? "保存中..."
            : isEdit
            ? "更新"
            : "创建"}
        </Button>
      </div>
    </div>
  );
}
