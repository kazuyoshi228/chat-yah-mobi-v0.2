import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Globe } from "lucide-react";

type Manual = {
  id: string;
  language: string;
  languageCode: string;
  title: string;
  description: string;
  version: string;
  updatedAt: string;
  url: string;
  pages: number;
  status: "latest" | "draft";
};

const MANUALS: Manual[] = [
  {
    id: "ja",
    language: "日本語",
    languageCode: "JA",
    title: "yah.mobile ご利用ガイド",
    description: "マザードキュメント。購入方法・eSIMインストール手順・トラブルシューティングを網羅した公式ガイド。",
    version: "v1.0",
    updatedAt: "2026-06-26",
    url: "/manus-storage/yah_mobile_user_guide_ja_2d2bafcd.pdf",
    pages: 18,
    status: "latest",
  },
  {
    id: "en",
    language: "English",
    languageCode: "EN",
    title: "yah.mobile User Guide",
    description: "Official guide covering purchase flow, eSIM installation steps, and troubleshooting for international travelers.",
    version: "v1.0",
    updatedAt: "2026-06-26",
    url: "/manus-storage/yah_mobile_user_guide_v2_8999ce1e.pdf",
    pages: 14,
    status: "latest",
  },
];

const PLANNED_LANGUAGES = [
  { code: "ZH", label: "中文（繁體/簡體）" },
  { code: "KO", label: "한국어" },
  { code: "TH", label: "ภาษาไทย" },
  { code: "VI", label: "Tiếng Việt" },
];

export default function UserManuals() {
  return (
    <DashboardLayout title="取扱説明書">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <FileText className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">取扱説明書</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              yah.mobile 公式ユーザーガイド — 多言語展開の管理
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">公開中</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{MANUALS.length} 言語</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-amber-50 to-yellow-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">準備中</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{PLANNED_LANGUAGES.length} 言語</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">マザー</p>
              <p className="text-lg font-bold text-gray-900 mt-1">日本語版</p>
            </CardContent>
          </Card>
        </div>

        {/* Published Manuals */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">公開中のガイド</h2>
          <div className="space-y-3">
            {MANUALS.map((manual) => (
              <Card key={manual.id} className="border border-gray-200 hover:border-teal-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-gray-400">{manual.languageCode}</span>
                          <span className="font-semibold text-gray-900 text-sm">{manual.title}</span>
                          {manual.status === "latest" && (
                            <Badge className="bg-teal-100 text-teal-700 border-0 text-xs px-2 py-0">
                              最新版
                            </Badge>
                          )}
                          {manual.id === "ja" && (
                            <Badge className="bg-purple-100 text-purple-700 border-0 text-xs px-2 py-0">
                              マザー
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{manual.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>{manual.version}</span>
                          <span>·</span>
                          <span>{manual.pages}ページ</span>
                          <span>·</span>
                          <span>更新: {manual.updatedAt}</span>
                        </div>
                      </div>
                    </div>
                    <a
                      href={manual.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Button variant="outline" size="sm" className="flex-shrink-0 gap-1.5">
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Planned Languages */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">多言語展開予定</h2>
          <Card className="border border-dashed border-gray-300 bg-gray-50">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-3">
                日本語版（マザードキュメント）をベースに以下の言語への翻訳を予定しています。
              </p>
              <div className="flex flex-wrap gap-2">
                {PLANNED_LANGUAGES.map((lang) => (
                  <Badge
                    key={lang.code}
                    variant="outline"
                    className="text-sm px-3 py-1 text-gray-500 border-gray-300"
                  >
                    <span className="font-mono text-xs mr-1.5 text-gray-400">{lang.code}</span>
                    {lang.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Note */}
        <Card className="border border-gray-200 bg-gray-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-800">更新方法：</span>
              新しいPDFを制作後、
              <code className="mx-1 px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">manus-upload-file --webdev</code>
              でアップロードし、このページの URL を更新してください。
              チャット画面へのダウンロードボタン追加は準備完了後に対応します。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
