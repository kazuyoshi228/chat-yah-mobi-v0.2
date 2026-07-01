import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, Plus, Pencil, Trash2, Zap, Search, X, Copy, Check,
  MessageSquare, ChevronRight, Filter
} from "lucide-react";
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

// カテゴリ別カラーマップ
const CATEGORY_COLORS: Record<string, string> = {
  "開始":    "bg-emerald-100 text-emerald-700 border-emerald-200",
  "接続":    "bg-blue-100 text-blue-700 border-blue-200",
  "設定":    "bg-violet-100 text-violet-700 border-violet-200",
  "QR":      "bg-amber-100 text-amber-700 border-amber-200",
  "エラー":  "bg-red-100 text-red-700 border-red-200",
  "メール":  "bg-sky-100 text-sky-700 border-sky-200",
  "テザリング": "bg-orange-100 text-orange-700 border-orange-200",
  "データ":  "bg-teal-100 text-teal-700 border-teal-200",
  "通話":    "bg-pink-100 text-pink-700 border-pink-200",
  "返金":    "bg-rose-100 text-rose-700 border-rose-200",
  "共感":    "bg-purple-100 text-purple-700 border-purple-200",
  "クローズ":"bg-gray-100 text-gray-700 border-gray-200",
  "その他":  "bg-gray-100 text-gray-600 border-gray-200",
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

type QuickReply = { id: number; title: string; content: string };

export default function AdminQuickReplies() {
  const { user } = useAuth();
  const { data: chat_quick_replies, refetch, isLoading } = trpc.admin.listQuickReplies.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const createQR = trpc.admin.createQuickReply.useMutation({
    onSuccess: () => { toast.success("定型文を追加しました"); refetch(); resetForm(); },
    onError: () => toast.error("追加に失敗しました"),
  });
  const updateQR = trpc.admin.updateQuickReply.useMutation({
    onSuccess: () => { toast.success("定型文を更新しました"); refetch(); resetForm(); },
    onError: () => toast.error("更新に失敗しました"),
  });
  const deleteQR = trpc.admin.deleteQuickReply.useMutation({
    onSuccess: () => { toast.success("削除しました"); refetch(); setSelectedId(null); },
    onError: () => toast.error("削除に失敗しました"),
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  const handleEdit = (qr: QuickReply) => {
    setEditingId(qr.id);
    setTitle(qr.title);
    setContent(qr.content);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    if (editingId) {
      updateQR.mutate({ id: editingId, title, content });
    } else {
      createQR.mutate({ title, content });
    }
  };

  const handleCopy = (qr: QuickReply) => {
    navigator.clipboard.writeText(qr.content);
    setCopiedId(qr.id);
    toast.success("クリップボードにコピーしました");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // カテゴリ一覧
  const categories = useMemo(() => {
    if (!chat_quick_replies) return [];
    const cats = new Set(chat_quick_replies.map((qr) => extractCategory(qr.title)));
    return Array.from(cats).sort();
  }, [chat_quick_replies]);

  // フィルタリング
  const filtered = useMemo(() => {
    if (!chat_quick_replies) return [];
    return chat_quick_replies.filter((qr) => {
      const cat = extractCategory(qr.title);
      const matchCat = !selectedCategory || cat === selectedCategory;
      const q = search.toLowerCase();
      const matchSearch = !q || qr.title.toLowerCase().includes(q) || qr.content.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [chat_quick_replies, search, selectedCategory]);

  // カテゴリ別グループ化
  const grouped = useMemo(() => {
    const map: Record<string, QuickReply[]> = {};
    for (const qr of filtered) {
      const cat = extractCategory(qr.title);
      if (!map[cat]) map[cat] = [];
      map[cat].push(qr);
    }
    return map;
  }, [filtered]);

  const selectedQR = useMemo(
    () => chat_quick_replies?.find((qr) => qr.id === selectedId) ?? null,
    [chat_quick_replies, selectedId]
  );

  // Cmd/Ctrl+K でサーチフォーカス
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (user?.role !== "admin") {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="p-6 text-gray-500">Admin access required</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="flex flex-col h-full bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Quick Replies</h1>
              <p className="text-xs text-gray-400">
                {chat_quick_replies?.length ?? 0}件の定型文
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-black hover:bg-gray-800 text-white gap-1.5 text-sm h-8 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            追加
          </Button>
        </div>

        {/* 検索バー */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="定型文を検索… (⌘K)"
              className="pl-8 pr-8 h-8 text-sm border-gray-200 bg-gray-50 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* カテゴリフィルター */}
        <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-2 overflow-x-auto flex-shrink-0 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors flex-shrink-0",
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
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors flex-shrink-0",
                selectedCategory === cat
                  ? "bg-black text-white border-black"
                  : `${getCategoryColor(cat)} hover:opacity-80`
              )}
            >
              {cat}
              <span className="ml-1 opacity-60">
                {chat_quick_replies?.filter((qr) => extractCategory(qr.title) === cat).length}
              </span>
            </button>
          ))}
        </div>

        {/* メインコンテンツ：左リスト + 右プレビュー */}
        <div className="flex flex-1 min-h-0">
          {/* 左：一覧 */}
          <div className="w-80 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">該当する定型文がありません</p>
              </div>
            ) : (
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  {/* カテゴリヘッダー */}
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                      getCategoryColor(cat)
                    )}>
                      {cat}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">{items.length}件</span>
                  </div>
                  {/* アイテム */}
                  {items.map((qr) => (
                    <button
                      key={qr.id}
                      onClick={() => setSelectedId(qr.id === selectedId ? null : qr.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-gray-50 transition-colors",
                        selectedId === qr.id
                          ? "bg-gray-900 text-white"
                          : "hover:bg-gray-50 text-gray-900"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-xs font-medium truncate",
                          selectedId === qr.id ? "text-white" : "text-gray-800"
                        )}>
                          {stripCategory(qr.title)}
                        </p>
                        <ChevronRight className={cn(
                          "w-3 h-3 flex-shrink-0",
                          selectedId === qr.id ? "text-gray-400" : "text-gray-300"
                        )} />
                      </div>
                      <p className={cn(
                        "text-xs mt-0.5 line-clamp-1",
                        selectedId === qr.id ? "text-gray-400" : "text-gray-400"
                      )}>
                        {qr.content.split("\n")[0]}
                      </p>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* 右：プレビュー */}
          <div className="flex-1 overflow-y-auto">
            {selectedQR ? (
              <div className="p-6">
                {/* プレビューヘッダー */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        getCategoryColor(extractCategory(selectedQR.title))
                      )}>
                        {extractCategory(selectedQR.title)}
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      {stripCategory(selectedQR.title)}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleCopy(selectedQR)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all",
                        copiedId === selectedQR.id
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      )}
                    >
                      {copiedId === selectedQR.id ? (
                        <><Check className="w-3 h-3" /> コピー済み</>
                      ) : (
                        <><Copy className="w-3 h-3" /> コピー</>
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(selectedQR)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-white text-gray-600 border-gray-200 hover:border-gray-400 transition-all"
                    >
                      <Pencil className="w-3 h-3" /> 編集
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("この定型文を削除しますか？")) {
                          deleteQR.mutate({ id: selectedQR.id });
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-white text-red-500 border-red-100 hover:border-red-300 transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> 削除
                    </button>
                  </div>
                </div>

                {/* コンテンツプレビュー */}
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                      <MessageSquare className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">オペレーター</span>
                  </div>
                  <div className="bg-gray-900 text-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedQR.content}
                  </div>
                </div>

                {/* 文字数 */}
                <p className="text-xs text-gray-400 mt-3 text-right">
                  {selectedQR.content.length}文字
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">定型文を選択してください</p>
                <p className="text-xs text-gray-400">左のリストから定型文を選ぶとプレビューが表示されます</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 追加/編集ダイアログ */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editingId ? "定型文を編集" : "定型文を追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">タイトル</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：【開始】対応開始の挨拶"
                className="border-gray-200 text-sm h-9"
              />
              <p className="text-xs text-gray-400">
                【カテゴリ名】タイトル の形式で入力するとカテゴリ別に整理されます
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">本文</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="定型文の本文を入力..."
                rows={6}
                className="border-gray-200 resize-none text-sm"
              />
              <p className="text-xs text-gray-400 text-right">{content.length}文字</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} className="border-gray-200 text-sm h-8">
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || createQR.isPending || updateQR.isPending}
              className="bg-black hover:bg-gray-800 text-white text-sm h-8"
            >
              {createQR.isPending || updateQR.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingId ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
