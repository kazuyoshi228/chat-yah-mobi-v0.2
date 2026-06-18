import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Zap, Search, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// カテゴリタグを抽出（【xxx】形式）
function extractCategory(title: string): string {
  const match = title.match(/^【(.+?)】/);
  return match ? match[1] : "その他";
}

function stripCategory(title: string): string {
  return title.replace(/^【.+?】\s*/, "");
}

const CATEGORY_COLORS: Record<string, string> = {
  "開始":       "bg-emerald-100 text-emerald-700 border-emerald-200",
  "接続":       "bg-blue-100 text-blue-700 border-blue-200",
  "設定":       "bg-violet-100 text-violet-700 border-violet-200",
  "QR":         "bg-amber-100 text-amber-700 border-amber-200",
  "エラー":     "bg-red-100 text-red-700 border-red-200",
  "メール":     "bg-sky-100 text-sky-700 border-sky-200",
  "テザリング": "bg-orange-100 text-orange-700 border-orange-200",
  "データ":     "bg-teal-100 text-teal-700 border-teal-200",
  "通話":       "bg-pink-100 text-pink-700 border-pink-200",
  "返金":       "bg-rose-100 text-rose-700 border-rose-200",
  "共感":       "bg-purple-100 text-purple-700 border-purple-200",
  "クローズ":   "bg-gray-100 text-gray-700 border-gray-200",
  "その他":     "bg-gray-100 text-gray-600 border-gray-200",
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

const sidebarItems = [
  { title: "Chat List", href: "/ops/chats", icon: MessageCircle },
  { title: "Quick Replies", href: "/ops/quick-replies", icon: Zap },
];

export default function OperatorQuickReplies() {
  const { data: quickReplies, isLoading } = trpc.operator.listQuickReplies.useQuery();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filtered = (quickReplies ?? []).filter((qr) => {
    const matchSearch =
      search === "" ||
      qr.title.toLowerCase().includes(search.toLowerCase()) ||
      qr.content.toLowerCase().includes(search.toLowerCase());
    const cat = extractCategory(qr.title);
    const matchCategory = !selectedCategory || cat === selectedCategory;
    return matchSearch && matchCategory;
  });

  const categories = Array.from(
    new Set((quickReplies ?? []).map((qr) => extractCategory(qr.title)))
  );

  const handleCopy = (qr: { id: number; content: string }) => {
    navigator.clipboard.writeText(qr.content).then(() => {
      setCopiedId(qr.id);
      toast.success("クリップボードにコピーしました");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Operator">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">Quick Replies</h1>
          </div>
          <p className="text-sm text-gray-500">定型文をコピーしてチャットに貼り付けてください。</p>
        </div>

        {/* Search + Category filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="タイトル・本文で検索..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
            />
          </div>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "text-xs px-3 py-1 rounded-full border transition-colors",
                !selectedCategory
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              )}
            >
              すべて
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  selectedCategory === cat
                    ? "bg-black text-white border-black"
                    : cn("bg-white hover:border-gray-400", getCategoryColor(cat))
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-sm text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            {search || selectedCategory ? "検索結果がありません" : "クイックリプライがありません"}
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((qr) => {
              const cat = extractCategory(qr.title);
              const displayTitle = stripCategory(qr.title);
              return (
                <div
                  key={qr.id}
                  className="group flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 h-4 border", getCategoryColor(cat))}
                      >
                        {cat}
                      </Badge>
                      <span className="text-sm font-medium text-gray-800 truncate">{displayTitle}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{qr.content}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(qr)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all",
                      copiedId === qr.id
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-black hover:text-white hover:border-black opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {copiedId === qr.id ? (
                      <><Check className="w-3 h-3" /> コピー済</>
                    ) : (
                      <><Copy className="w-3 h-3" /> コピー</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
