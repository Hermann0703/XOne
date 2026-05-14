"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContractTypeList from "@/plugins/builtin/work/contracts/ContractTypeList";
import StageTypeList from "@/plugins/builtin/work/contracts/StageTypeList";
import ClassificationList from "@/plugins/builtin/work/contracts/ClassificationList";
import LookupDictList from "@/plugins/builtin/work/contracts/LookupDictList";

const TABS = [
  { id: "contract-types", label: "contracts.catalog.contractTypes", Component: ContractTypeList },
  { id: "stage-types", label: "contracts.catalog.stageTypes", Component: StageTypeList },
  { id: "classifications", label: "contracts.catalog.classifications", Component: ClassificationList },
  { id: "lookup", label: "contracts.catalog.lookup", Component: LookupDictList },
];

export default function CatalogHub() {
  const t = useTranslations();
  const [tab, setTab] = useState("contract-types");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("contracts.catalog.title")}</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          {TABS.map(({ id, label }) => (
            <TabsTrigger key={id} value={id}>{t(label)}</TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ id, Component }) => (
          <TabsContent key={id} value={id}>
            <Component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
