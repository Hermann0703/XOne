"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import Dashboard from "@/plugins/builtin/personal/shopping/Dashboard";
import ShoppingList from "@/plugins/builtin/personal/shopping/ShoppingList";
import BudgetList from "@/plugins/builtin/personal/shopping/BudgetList";

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
