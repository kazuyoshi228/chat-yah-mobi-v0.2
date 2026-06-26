import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";

export default function Improvements() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">定期的な改善</h1>
          <p className="text-sm text-muted-foreground mt-1">AIチャットボットの品質向上施策</p>
        </div>

        {/* AI選択カード */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-4 h-4 text-indigo-500" />
              AIモデルの選択
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  { name: "GPT-4o", quality: "★★★★☆", cost: "5.5円", ratio: "x1.0", status: "使用中", statusClass: "bg-emerald-100 text-emerald-700" },
                  { name: "Claude Sonnet 4.6", quality: "★★★★★", cost: "7.0円", ratio: "x1.3", status: "推奨", statusClass: "bg-blue-100 text-blue-700" },
                  { name: "Claude Opus 4.7", quality: "★★★★★", cost: "11.7円", ratio: "x2.1", status: "検証中", statusClass: "bg-amber-100 text-amber-700" },
                  { name: "Gemini 3.1 Pro", quality: "★★★★☆", cost: "2.8円", ratio: "x0.5", status: "候補", statusClass: "bg-gray-100 text-gray-600" },
                  { name: "GPT-5-mini", quality: "★★★☆☆", cost: "0.9円", ratio: "x0.2", status: "候補", statusClass: "bg-gray-100 text-gray-600" },
                ].map((m) => (
                  <tr key={m.name} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{m.name}</td>
                    <td className="py-2.5 px-3 text-center text-xs">{m.quality}</td>
                    <td className="py-2.5 px-3 text-center">{m.cost}</td>
                    <td className="py-2.5 px-3 text-center text-muted-foreground">{m.ratio}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.statusClass}`}>{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              ※ コストは1セッション平均3ターン・システムプロンプト+RAGコンテキスト込みの試算。Opusのシミュレーション結果は検証後に反映予定。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
