"use client";

// 台账管理统一入口
// 使用 Tabs 分标签页嵌入各子列表组件

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tag, Layers, Shield, BookOpen, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ContractTypeList from "@/plugins/builtin/work/contracts/ContractTypeList";
import StageTypeList from "@/plugins/builtin/work/contracts/StageTypeList";
import ClassificationList from "@/plugins/builtin/work/contracts/ClassificationList";
import LookupDictList from "@/plugins/builtin/work/contracts/LookupDictList";
import TimelineTemplateList from "@/plugins/builtin/work/contracts/TimelineTemplateList";

const TABS = [
  { value: "contract-types", label: "合同类型", icon: Tag },
  { value: "stage-types", label: "阶段类型", icon: Layers },
  { value: "classifications", label: "密级管理", icon: Shield },
  { value: "lookup-dicts", label: "通用字典", icon: BookOpen },
  { value: "timeline-templates", label: "时间轴模板", icon: Clock },
] as const;

export default function CatalogHub() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<string>(TABS[0].value);

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon className="size-4 mr-1.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="contract-types">
          <ContractTypeList />
        </TabsContent>

        <TabsContent value="stage-types">
          <StageTypeList />
        </TabsContent>

        <TabsContent value="classifications">
          <ClassificationList />
        </TabsContent>

        <TabsContent value="lookup-dicts">
          <LookupDictList />
        </TabsContent>

        <TabsContent value="timeline-templates">
          <TimelineTemplateList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
