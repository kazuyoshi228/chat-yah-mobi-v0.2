import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Languages, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type CardData = {
  nextDate: string;
  lastDate: string;
  notes: string;
};

function ImprovementCard({
  cardKey,
  title,
  icon: Icon,
  iconColor,
  children,
  initialData,
}: {
  cardKey: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  children?: React.ReactNode;
  initialData?: { nextDate: Date | null; lastDate: Date | null; notes: string | null };
}) {
  const [form, setForm] = useState<CardData>({
    nextDate: "",
    lastDate: "",
    notes: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        nextDate: initialData.nextDate ? new Date(initialData.nextDate).toISOString().slice(0, 10) : "",
        lastDate: initialData.lastDate ? new Date(initialData.lastDate).toISOString().slice(0, 10) : "",
        notes: initialData.notes ?? "",
      });
    }
  }, [initialData]);

  const update = trpc.improvements.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("保存しました");
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">次回実施予定日</Label>
            <Input
              type="date"
              value={form.nextDate}
              onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">前回実施日</Label>
            <Input
              type="date"
              value={form.lastDate}
              onChange={(e) => setForm((f) => ({ ...f, lastDate: e.target.value }))}
              className="text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">メモ</Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="任意メモ"
            className="text-sm"
          />
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={update.isPending || saved}
          onClick={() =>
            update.mutate({
              cardKey,
              nextDate: form.nextDate || null,
              lastDate: form.lastDate || null,
              notes: form.notes || null,
            })
          }
        >
          {saved ? (
            <><Check className="w-3.5 h-3.5 mr-1" />保存済み</>
          ) : update.isPending ? "保存中..." : "保存"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Improvements() {
  const { data: cards } = trpc.improvements.getAll.useQuery();

  const getCard = (key: string) => cards?.find((c) => c.cardKey === key);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">定期的な改善</h1>
          <p className="text-sm text-muted-foreground mt-1">AIチャットボットの品質向上施策</p>
        </div>

        {/* AIモデル選択 */}
        <ImprovementCard
          cardKey="ai_model"
          title="AIモデルの選択"
          icon={Bot}
          iconColor="text-indigo-500"
          initialData={getCard("ai_model")}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-4 font-medium">モデル</th>
                <th className="text-center py-2 px-3 font-medium">品質</th>
                <th className="text-center py-2 px-3 font-medium">コスト/セッション</th>
                <th className="text-center py-2 px-3 font-medium">GPT-4o比</th>
                <th className="text-center py-2 px-3 font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "GPT-4o", quality: "★★★★☆", cost: "5.5円", ratio: "x1.0", status: "旧モデル", cls: "bg-gray-100 text-gray-500" },
                { name: "Claude Sonnet 4.6", quality: "★★★★★", cost: "7.0円", ratio: "x1.3", status: "候補", cls: "bg-blue-100 text-blue-700" },
                { name: "Claude Opus 4.7", quality: "★★★★★", cost: "11.7円", ratio: "x2.1", status: "使用中", cls: "bg-emerald-100 text-emerald-700" },
                { name: "Gemini 3.1 Pro", quality: "★★★★☆", cost: "2.8円", ratio: "x0.5", status: "候補", cls: "bg-gray-100 text-gray-600" },
                { name: "GPT-5-mini", quality: "★★★☆☆", cost: "0.9円", ratio: "x0.2", status: "候補", cls: "bg-gray-100 text-gray-600" },
              ].map((m) => (
                <tr key={m.name} className="border-b last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{m.name}</td>
                  <td className="py-2.5 px-3 text-center text-xs">{m.quality}</td>
                  <td className="py-2.5 px-3 text-center">{m.cost}</td>
                  <td className="py-2.5 px-3 text-center text-muted-foreground">{m.ratio}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.cls}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ImprovementCard>

        {/* RAGドキュメントの外部翻訳 */}
        <ImprovementCard
          cardKey="rag_translation"
          title="RAGドキュメントの外部翻訳"
          icon={Languages}
          iconColor="text-teal-500"
          initialData={getCard("rag_translation")}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-4 font-medium">言語</th>
                <th className="text-center py-2 px-3 font-medium">ドキュメント数</th>
                <th className="text-center py-2 px-3 font-medium">翻訳品質</th>
                <th className="text-center py-2 px-3 font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {[
                { lang: "英語 (EN)", count: "28件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
                { lang: "中国語 (ZH)", count: "28件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
                { lang: "韓国語 (KO)", count: "28件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
                { lang: "タイ語 (TH)", count: "18件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
                { lang: "ベトナム語 (VI)", count: "16件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
                { lang: "英語・中国語・韓国語", count: "全件", quality: "ネイティブ校正", status: "要対応", cls: "bg-amber-100 text-amber-700" },
              ].map((r) => (
                <tr key={r.lang} className="border-b last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{r.lang}</td>
                  <td className="py-2.5 px-3 text-center">{r.count}</td>
                  <td className="py-2.5 px-3 text-center text-muted-foreground">{r.quality}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.cls}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            現在128件のRAGドキュメントはAI翻訳済み。英語・中国語・韓国語はネイティブ校正を推奨。
          </p>
        </ImprovementCard>
      </div>
    </DashboardLayout>
  );
}
