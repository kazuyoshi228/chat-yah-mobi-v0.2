import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Smartphone, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";

export default function HistoricalDocs() {
  return (
    <DashboardLayout title="歴史資料">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">SIMロック歴史資料 & eSIM対応端末リスト</h1>
          <p className="text-muted-foreground mt-1">
            6カ国のSIMロック規制の歴史と、全メーカーのeSIM対応状況を網羅的にまとめた資料です。
            チャットサポートにおける接続トラブル対応の参考資料としてご活用ください。
          </p>
        </div>

        <Tabs defaultValue="sim-lock" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sim-lock">
              <Globe className="w-4 h-4 mr-2" />
              各国SIMロック状況
            </TabsTrigger>
            <TabsTrigger value="devices">
              <Smartphone className="w-4 h-4 mr-2" />
              端末対応リスト
            </TabsTrigger>
            <TabsTrigger value="troubleshoot">
              <AlertTriangle className="w-4 h-4 mr-2" />
              接続トラブル原因
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: 各国SIMロック状況 */}
          <TabsContent value="sim-lock" className="space-y-4 mt-4">
            {/* Japan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-slate-700 text-xs font-bold">JP</span> 日本（Japan）
                  <Badge variant="default" className="ml-2">SIMロック原則禁止（2021年10月〜）</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  日本は世界的に見ても最もSIMロックが深く根付いた市場の一つであった。NTTドコモ、KDDI（au）、ソフトバンクの3大キャリアが端末販売と回線契約を一体化した「キャリアモデル」を長年維持していた。
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>年月</TableHead>
                      <TableHead>出来事</TableHead>
                      <TableHead>影響</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">2010年6月</TableCell>
                      <TableCell>総務省「SIMロック解除に関するガイドライン」策定</TableCell>
                      <TableCell>自主的な解除を促すも強制力なし</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">2015年5月</TableCell>
                      <TableCell>SIMロック解除義務化（購入後180日経過後）</TableCell>
                      <TableCell>3大キャリアに解除対応を義務付け</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">2017年8月</TableCell>
                      <TableCell>解除可能期間を100日に短縮</TableCell>
                      <TableCell>消費者の乗り換え促進</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">2019年10月</TableCell>
                      <TableCell>電気通信事業法改正（端末割引上限2万円）</TableCell>
                      <TableCell>中古SIMフリー端末の需要増加</TableCell>
                    </TableRow>
                    <TableRow className="bg-green-50 dark:bg-green-950/20">
                      <TableCell className="font-bold">2021年10月1日</TableCell>
                      <TableCell className="font-bold">SIMロック原則禁止（総務省ガイドライン改正）</TableCell>
                      <TableCell className="font-bold">以降発売の端末はSIMフリーが義務</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-800 dark:text-amber-200">中古市場の注意点</span>
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    2024年度の中古スマートフォン販売台数は321.4万台。2021年10月以前の端末にはSIMロックが残存しており、中古市場の約30-40%はSIMロック端末と推定される。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* USA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-slate-700 text-xs font-bold">US</span> 米国（United States）
                  <Badge variant="secondary" className="ml-2">SIMロック一般的（解除は容易）</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  米国はSIMロックが依然として一般的な市場であるが、支払い完了後の解除が法的に保証されている。アンロック端末の比率は約12%。
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>キャリア</TableHead>
                      <TableHead>解除条件</TableHead>
                      <TableHead>備考</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">AT&T</TableCell>
                      <TableCell>端末代金完済後60日で自動解除</TableCell>
                      <TableCell>プリペイドは6ヶ月使用後</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">T-Mobile</TableCell>
                      <TableCell>端末代金完済後に申請で解除</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Verizon</TableCell>
                      <TableCell>購入後60日で自動解除</TableCell>
                      <TableCell>2019年以降の端末</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-800 dark:text-red-200">重要: 米国版端末のeSIM制限</span>
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    米国版Samsung Galaxy S20/S21、Note 20 Ultra、Z Fold2、Z Flip 5GはeSIM機能が無効化されている。SIMロック解除してもeSIMは使用不可。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* China */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-slate-700 text-xs font-bold">CN</span> 中国（China）
                  <Badge variant="default" className="ml-2 bg-green-600">SIMロック禁止（法律）</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  中国は法律によりSIMロック端末の販売が禁止されている。全ての端末はSIMフリーで販売される。ただし、中国本土版端末はeSIM機能が無効化されている（政府規制）。
                </p>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-800 dark:text-red-200">中国版端末のeSIM制限</span>
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    中国本土版iPhone（iPhone Air除く）、Samsung、Huawei等は全てeSIM非対応。物理SIMのみ使用可能。iPhone Airが中国初のeSIM対応iPhoneとなった。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Korea */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-slate-700 text-xs font-bold">KR</span> 韓国（South Korea）
                  <Badge variant="default" className="ml-2 bg-green-600">SIMロックなし</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  韓国はSIMロックが事実上存在しない市場。2010年に放送通信委員会がUSIM移動性制約を摘発して以降、完全な自由化が実現している。
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-800 dark:text-amber-200">韓国版Samsung端末のeSIM制限</span>
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    韓国版Galaxy S20〜S22、Note 20、Z Fold〜Z Fold3、Z Flip〜Z Flip3はeSIM非対応。S23以降、Z Fold4/5、Z Flip4/5、A54 5Gは対応。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Thailand */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-slate-700 text-xs font-bold">TH</span> タイ（Thailand）
                  <Badge variant="default" className="ml-2 bg-green-600">SIMロックなし</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  タイはSIMロックの概念がほぼ存在しない市場。AIS、True Corp、DTACの主要キャリアが存在するが、端末販売にSIMロックを設定する慣行がない。年間出荷約2,000万台は全てSIMフリー。旅行者が持ち込む海外キャリアロック端末のみが問題となる。
                </p>
              </CardContent>
            </Card>

            {/* Vietnam */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-slate-700 text-xs font-bold">VN</span> ベトナム（Vietnam）
                  <Badge variant="default" className="ml-2 bg-green-600">SIMロックなし</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ベトナムもSIMロックが存在しない市場。Viettel、Mobifone、Vinaphoneの3大キャリアが市場を支配するが、端末にSIMロックを設定する慣行はない。中古市場では海外からの輸入ロック端末が少数流通している。
                </p>
              </CardContent>
            </Card>

            {/* Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>各国SIMロック端末の推定残存台数</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>国</TableHead>
                      <TableHead>年間出荷</TableHead>
                      <TableHead>SIMロック比率（新品）</TableHead>
                      <TableHead>残存推定台数</TableHead>
                      <TableHead>主な流通経路</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium"><span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-700 text-[10px] font-bold mr-1.5">JP</span>日本</TableCell>
                      <TableCell>3,300万台</TableCell>
                      <TableCell><Badge variant="default" className="bg-green-600">0%</Badge></TableCell>
                      <TableCell>約2,000-3,000万台</TableCell>
                      <TableCell>中古市場（ゲオ、メルカリ等）</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium"><span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-700 text-[10px] font-bold mr-1.5">US</span>米国</TableCell>
                      <TableCell>1.5億台</TableCell>
                      <TableCell><Badge variant="destructive">約88%</Badge></TableCell>
                      <TableCell>約2-3億台</TableCell>
                      <TableCell>キャリア直販、中古市場</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium"><span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-700 text-[10px] font-bold mr-1.5">CN</span>中国</TableCell>
                      <TableCell>2.7億台</TableCell>
                      <TableCell><Badge variant="default" className="bg-green-600">0%</Badge></TableCell>
                      <TableCell>0台</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium"><span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-700 text-[10px] font-bold mr-1.5">KR</span>韓国</TableCell>
                      <TableCell>1,500万台</TableCell>
                      <TableCell><Badge variant="default" className="bg-green-600">0%</Badge></TableCell>
                      <TableCell>0台</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium"><span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-700 text-[10px] font-bold mr-1.5">TH</span>タイ</TableCell>
                      <TableCell>2,000万台</TableCell>
                      <TableCell><Badge variant="default" className="bg-green-600">0%</Badge></TableCell>
                      <TableCell>ごく少数</TableCell>
                      <TableCell>中古輸入品</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium"><span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-700 text-[10px] font-bold mr-1.5">VN</span>ベトナム</TableCell>
                      <TableCell>1,500万台</TableCell>
                      <TableCell><Badge variant="default" className="bg-green-600">0%</Badge></TableCell>
                      <TableCell>ごく少数</TableCell>
                      <TableCell>中古輸入品</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: 端末対応リスト */}
          <TabsContent value="devices" className="space-y-4 mt-4">
            {/* Apple */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" /> Apple iPhone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>モデル</TableHead>
                        <TableHead>eSIM</TableHead>
                        <TableHead>備考</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>iPhone XR / XS / XS Max</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>中国本土版・香港版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone 11 / 11 Pro / 11 Pro Max</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>中国本土版・香港版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone SE 2 (2020)</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>香港版も対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone 12シリーズ</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>中国本土版は非対応。香港版12 Miniは対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone 13シリーズ</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>デュアルeSIM対応。中国本土版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone SE 3 (2022)</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>中国本土版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone 14シリーズ</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell className="font-medium text-blue-600">米国版はeSIMのみ（物理SIMなし）</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone 15シリーズ</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>米国版はeSIMのみ</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone 16シリーズ / 16e</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>米国版はeSIMのみ</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone 17シリーズ</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>日本・米国等はeSIMのみ。中国版はSIMのみ</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>iPhone Air</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell className="font-medium text-green-600">世界初グローバルeSIMのみ。中国でもeSIM対応</TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50 dark:bg-red-950/20">
                        <TableCell>iPhone X以前の全モデル</TableCell>
                        <TableCell><XCircle className="w-4 h-4 text-red-600" /></TableCell>
                        <TableCell>eSIM非対応</TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50 dark:bg-red-950/20">
                        <TableCell>中国本土版iPhone（Air除く）</TableCell>
                        <TableCell><XCircle className="w-4 h-4 text-red-600" /></TableCell>
                        <TableCell>eSIM機能無効化</TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50 dark:bg-red-950/20">
                        <TableCell>香港・マカオ版iPhone</TableCell>
                        <TableCell><XCircle className="w-4 h-4 text-red-600" /></TableCell>
                        <TableCell>13 mini, 12 mini, SE 2020, XS除く</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Samsung */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" /> Samsung Galaxy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>モデル</TableHead>
                        <TableHead>eSIM</TableHead>
                        <TableHead>備考</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Galaxy S20〜S21シリーズ</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell className="text-red-600 font-medium">米国版・韓国版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Galaxy S22シリーズ</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell className="text-red-600 font-medium">韓国版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Galaxy S23〜S26シリーズ</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>韓国版も対応。中国・香港版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Galaxy Note 20シリーズ</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell className="text-red-600 font-medium">米国版・韓国版・香港版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Galaxy Z Fold〜Z Fold3</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell className="text-red-600 font-medium">米国版・韓国版・香港版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Galaxy Z Fold4〜Z Fold7</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>韓国版も対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Galaxy Z Flip〜Z Flip3</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell className="text-red-600 font-medium">米国版・韓国版は非対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Galaxy Z Flip4〜Z Flip7</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>韓国版も対応</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Galaxy A54/A55/A35/A36/A56/A17</TableCell>
                        <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                        <TableCell>—</TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50 dark:bg-red-950/20">
                        <TableCell>Galaxy S20 FE / Aシリーズ大部分 / Mシリーズ全て</TableCell>
                        <TableCell><XCircle className="w-4 h-4 text-red-600" /></TableCell>
                        <TableCell>eSIM非対応</TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50 dark:bg-red-950/20">
                        <TableCell>中国・香港・台湾版の全Samsung端末</TableCell>
                        <TableCell><XCircle className="w-4 h-4 text-red-600" /></TableCell>
                        <TableCell>eSIM機能無効化</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Other Manufacturers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" /> その他のメーカー
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>メーカー</TableHead>
                        <TableHead>eSIM対応モデル</TableHead>
                        <TableHead>eSIM非対応</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Google Pixel</TableCell>
                        <TableCell>Pixel 2以降の全モデル</TableCell>
                        <TableCell>豪・台・日版Pixel 3、東南アジア版3a、香港版全て</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Xiaomi</TableCell>
                        <TableCell>12T Pro, 13〜17シリーズ, Redmi Note 13 Pro+〜15 Pro+, Poco X7/X8/F8</TableCell>
                        <TableCell>12以前、Redmi/Pocoの大部分</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">OPPO</TableCell>
                        <TableCell>Find X3〜X9, Find N2 Flip/N3/N5, Reno 14〜15, A55s 5G</TableCell>
                        <TableCell>Liteシリーズ全て、Aシリーズ大部分</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Sony</TableCell>
                        <TableCell>Xperia 1 IV〜VIII, 5 IV〜V, 10 III Lite〜VII</TableCell>
                        <TableCell>Xperia 1 III以前、5 III以前</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Motorola</TableCell>
                        <TableCell>Razr全モデル、Edge 2022以降、Moto G34以降の一部</TableCell>
                        <TableCell>Moto Eシリーズ全て、旧Gシリーズ</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Huawei</TableCell>
                        <TableCell>P40, P40 Pro, Mate 40 Pro, Pura 70 Pro</TableCell>
                        <TableCell>P40 Pro+, P50 Pro, 中国版全て</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Honor</TableCell>
                        <TableCell>Magic 4 Pro〜8 Pro, Honor 90/200 Pro/400 Lite, Magic V2〜V6</TableCell>
                        <TableCell>地域により異なる</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Vivo</TableCell>
                        <TableCell>X80 Pro〜X300 Pro, V29/V40/V50, iQOO 15</TableCell>
                        <TableCell>地域により異なる</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">OnePlus</TableCell>
                        <TableCell>11, 12, 13, 13R, 15, Open</TableCell>
                        <TableCell>10以前の全モデル</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Sharp</TableCell>
                        <TableCell>AQUOS sense4 lite〜9, R7〜R10, wish〜wish3</TableCell>
                        <TableCell>日本市場限定</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Nokia</TableCell>
                        <TableCell>G60, XR21, X30</TableCell>
                        <TableCell>他の全モデル</TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50 dark:bg-red-950/20">
                        <TableCell className="font-medium">LG</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>全モデル非対応（事業撤退済み）</TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50 dark:bg-red-950/20">
                        <TableCell className="font-medium">格安中国ブランド</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>Tecno, Infinix, itel等は全て非対応</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: 接続トラブル原因 */}
          <TabsContent value="troubleshoot" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>接続トラブルの主要原因と対応フロー</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                    SIMロック端末による接続失敗
                  </h3>
                  <p className="text-sm text-muted-foreground ml-8">
                    最も頻繁に発生する接続トラブルの原因。特に日本の中古キャリア端末（2021年10月以前購入）と米国のキャリアロック端末（割賦購入中）が多い。
                  </p>
                  <div className="ml-8 bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">確認方法:</p>
                    <p>設定 → 一般 → 情報 → 「SIMロック」の項目を確認（iPhoneの場合）</p>
                    <p>または *#06# をダイヤルしてEIDの有無を確認</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                    eSIM非対応端末
                  </h3>
                  <p className="text-sm text-muted-foreground ml-8">
                    端末がeSIMに対応していない場合、QRコードをスキャンしてもプロファイルをインストールできない。中国本土版iPhone、韓国版Samsung旧モデル、古い端末、格安端末が該当。
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                    地域版による機能制限
                  </h3>
                  <p className="text-sm text-muted-foreground ml-8">
                    同じモデルでも購入地域によってeSIM対応が異なる。米国版Samsung S20/S21はeSIM非対応、香港版Pixel全モデルも非対応。Samsung Regional Lockにも注意。
                  </p>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-lg mb-3">チャットサポート対応フロー</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <div className="font-bold text-blue-700 dark:text-blue-300 text-sm">Step 1</div>
                      <div className="text-xs mt-1">端末メーカー・モデル確認</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <div className="font-bold text-blue-700 dark:text-blue-300 text-sm">Step 2</div>
                      <div className="text-xs mt-1">購入国・キャリア確認</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <div className="font-bold text-blue-700 dark:text-blue-300 text-sm">Step 3</div>
                      <div className="text-xs mt-1">SIMロック状態確認</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <div className="font-bold text-blue-700 dark:text-blue-300 text-sm">Step 4</div>
                      <div className="text-xs mt-1">解除手順案内 or 非対応通知</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
