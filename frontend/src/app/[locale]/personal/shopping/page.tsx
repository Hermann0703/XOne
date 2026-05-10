"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Wallet, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

const Dashboard = dynamic(() => import("@/plugins/builtin/personal/shopping/Dashboard"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
    </div>
  ),
});

const ShoppingList = dynamic(() => import("@/plugins/builtin/personal/shopping/ShoppingList"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
    </div>
  ),
});

const BudgetList = dynamic(() => import("@/plugins/builtin/personal/shopping/BudgetList"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
    </div>
  ),
});

export default function ShoppingPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState("items");

  return (
    <div className="space-y-6">
      <PageHeader title={t("shopping.title")} description={t("shopping.stats.total")} />

      <Dashboard />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items">
            <ShoppingCart className="size-4 mr-1.5" />
            {t("shopping.title")}
          </TabsTrigger>
          <TabsTrigger value="budgets">
            <Wallet className="size-4 mr-1.5" />
            {t("shopping.budget.title")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <ShoppingList />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
