/**
 * CustomersFirebase — 顧客管理画面（Firestore版）
 * tRPC → Firestore SDK 直接
 */
import { useState, useMemo } from "react";
import { useCollection } from "@/hooks/useFirestoreAdmin";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(d: any) {
  if (!d) return "—";
  // Handle Firestore Timestamp
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatYen(n: number | null | undefined) {
  if (n == null) return "—";
  return `¥${n.toLocaleString()}`;
}

export default function CustomersFirebase() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { docs: customers, loading: isLoading } = useCollection("customerProfiles");
  const { docs: allPurchases, loading: purchasesLoading } = useCollection("purchases");
  const { docs: allEsimStatuses, loading: esimLoading } = useCollection("esimStatuses");

  // Find selected customer profile
  const selectedProfile = useMemo(
    () => customers.find((c) => (c as any).externalUserId === selectedUserId) ?? null,
    [customers, selectedUserId]
  );

  // Filter purchases for selected user
  const userPurchases = useMemo(
    () => selectedUserId
      ? allPurchases.filter((p) => (p as any).externalUserId === selectedUserId)
      : [],
    [allPurchases, selectedUserId]
  );

  // Filter eSIM statuses for selected user
  const userEsimStatuses = useMemo(
    () => selectedUserId
      ? allEsimStatuses.filter((e) => (e as any).externalUserId === selectedUserId)
      : [],
    [allEsimStatuses, selectedUserId]
  );

  const detailLoading = purchasesLoading || esimLoading;

  return (
    <DashboardLayout title="Customers">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            yah.mobi/appから同期された顧客プロファイル・購入履歴・eSIM状態を閲覧できます
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 顧客一覧 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">顧客一覧</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4"><Skeleton className="h-32 w-full" /></div>
                ) : customers.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    まだデータがありません。
                  </p>
                ) : (
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {customers.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedUserId(c.externalUserId)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedUserId === c.externalUserId ? "bg-muted" : ""}`}
                      >
                        <p className="text-sm font-medium">{c.name ?? "名前なし"}</p>
                        <p className="text-xs text-muted-foreground">{c.email ?? c.externalUserId}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Badge variant="outline" className="text-xs">{c.language?.toUpperCase() ?? "JA"}</Badge>
                          <span className="ml-1">登録: {formatDate(c.registeredAt)}</span>
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 顧客詳細 */}
          <div className="lg:col-span-2">
            {!selectedUserId ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground text-sm">
                  左の顧客一覧から選択すると購入履歴とeSIM状態が表示されます
                </CardContent>
              </Card>
            ) : detailLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-4">
                {/* プロフィール */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">プロフィール</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">名前:</span> {(selectedProfile as any)?.name ?? "—"}</div>
                    <div><span className="text-muted-foreground">メール:</span> {(selectedProfile as any)?.email ?? "—"}</div>
                    <div><span className="text-muted-foreground">言語:</span> {(selectedProfile as any)?.language?.toUpperCase() ?? "—"}</div>
                    <div><span className="text-muted-foreground">登録日:</span> {formatDate((selectedProfile as any)?.registeredAt)}</div>
                  </CardContent>
                </Card>

                {/* 購入履歴 */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">購入履歴</CardTitle></CardHeader>
                  <CardContent>
                    {userPurchases.length === 0 ? (
                      <p className="text-sm text-muted-foreground">購入履歴なし</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>プラン</TableHead>
                            <TableHead>金額</TableHead>
                            <TableHead>購入日</TableHead>
                            <TableHead>有効期限</TableHead>
                            <TableHead>状態</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userPurchases.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell>{p.planName}</TableCell>
                              <TableCell>{formatYen(p.priceYen)}</TableCell>
                              <TableCell>{formatDate(p.purchasedAt)}</TableCell>
                              <TableCell>{formatDate(p.expiresAt)}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  p.status === "active" ? "default" :
                                  p.status === "expired" ? "secondary" :
                                  p.status === "refunded" ? "destructive" : "outline"
                                }>
                                  {p.status === "active" ? "有効" :
                                   p.status === "expired" ? "期限切れ" :
                                   p.status === "refunded" ? "返金済" :
                                   p.status === "cancelled" ? "キャンセル" : "処理中"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* eSIM状態 */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">eSIM状態</CardTitle></CardHeader>
                  <CardContent>
                    {userEsimStatuses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">eSIMデータなし</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ICCID</TableHead>
                            <TableHead>状態</TableHead>
                            <TableHead>データ使用量</TableHead>
                            <TableHead>有効期限</TableHead>
                            <TableHead>最終同期</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userEsimStatuses.map((e: any) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-mono text-xs">{e.iccid ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  e.status === "active" ? "default" :
                                  e.status === "error" ? "destructive" : "secondary"
                                }>
                                  {e.status === "active" ? "接続中" :
                                   e.status === "installed" ? "インストール済" :
                                   e.status === "not_installed" ? "未インストール" :
                                   e.status === "expired" ? "期限切れ" : "エラー"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {e.dataUsedMb != null && e.dataTotalMb != null
                                  ? `${e.dataUsedMb} / ${e.dataTotalMb} MB`
                                  : e.dataUsedMb != null ? `${e.dataUsedMb} MB使用` : "—"}
                              </TableCell>
                              <TableCell>{formatDate(e.expiresAt)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDate(e.syncedAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
