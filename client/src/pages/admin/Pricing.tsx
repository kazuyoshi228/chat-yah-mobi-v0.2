import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatYen(n: number | null | undefined) {
  if (n == null) return "—";
  return `¥${n.toLocaleString()}`;
}

export default function Pricing() {
  const { data: plans, isLoading } = trpc.plans.list.useQuery();
  const { data: competitors, isLoading: compLoading } = trpc.plans.competitorList.useQuery();

  return (
    <DashboardLayout title="Pricing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pricing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            yah.mobi/appからWebhookで同期された自社プランと競合価格を閲覧できます
          </p>
        </div>

        {/* 自社プラン */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">自社プラン（yah.mobi/appから同期）</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !plans || plans.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                まだデータがありません。yah.mobi/appからWebhookで同期されると表示されます。
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>プラン名</TableHead>
                    <TableHead>データ容量</TableHead>
                    <TableHead>有効期間</TableHead>
                    <TableHead>価格</TableHead>
                    <TableHead>おすすめ用途</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>最終同期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.dataGb} GB</TableCell>
                      <TableCell>{p.durationDays}日間</TableCell>
                      <TableCell className="font-semibold text-emerald-600">{formatYen(p.priceYen)}</TableCell>
                      <TableCell>{p.bestFor ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? "default" : "secondary"}>
                          {p.isActive ? "有効" : "無効"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.syncedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 競合プラン */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">競合価格（yah.mobi/appから同期）</CardTitle>
          </CardHeader>
          <CardContent>
            {compLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !competitors || competitors.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                まだデータがありません。
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>競合他社</TableHead>
                    <TableHead>プラン名</TableHead>
                    <TableHead>データ容量</TableHead>
                    <TableHead>有効期間</TableHead>
                    <TableHead>価格</TableHead>
                    <TableHead>参照元</TableHead>
                    <TableHead>最終同期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.competitorName}</TableCell>
                      <TableCell>{c.planName}</TableCell>
                      <TableCell>{c.dataGb} GB</TableCell>
                      <TableCell>{c.durationDays}日間</TableCell>
                      <TableCell className="font-semibold text-rose-500">{formatYen(c.priceYen)}</TableCell>
                      <TableCell>
                        {c.sourceUrl ? (
                          <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">
                            リンク
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(c.syncedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
