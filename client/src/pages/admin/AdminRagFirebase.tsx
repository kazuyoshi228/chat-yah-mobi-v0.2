/**
 * AdminRagFirebase — RAG ドキュメント管理画面（Firestore版）
 * tRPC → Firestore SDK 直接
 */
import { useState, useMemo } from "react";
import { orderBy } from "firebase/firestore";
import { useCollection, useAddDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useFirestoreAdmin";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, BookOpen, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LangFilter = "all" | "ja" | "en" | "zh" | "ko" | "th" | "vi" | "other";

const LANG_FILTERS: { key: LangFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ja", label: "日本語" },
  { key: "en", label: "EN" },
  { key: "zh", label: "中文" },
  { key: "ko", label: "한국어" },
  { key: "th", label: "ไทย" },
  { key: "vi", label: "Tiếng Việt" },
  { key: "other", label: "Other" },
];

function detectLanguage(text: string): LangFilter {
  const sample = text.slice(0, 200);
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) return "ja";
  if (/[\u4E00-\u9FFF]/.test(sample)) return "zh";
  if (/[\uAC00-\uD7A3]/.test(sample)) return "ko";
  if (/[\u0E00-\u0E7F]/.test(sample)) return "th";
  if (/[\u00C0-\u024F]/.test(sample)) return "vi";
  if (/^[a-zA-Z\s.,!?]+$/.test(sample)) return "en";
  return "other";
}

interface RagDoc {
  id: string;
  title: string;
  content: string;
  category?: string;
  isActive?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export default function AdminRagFirebase() {
  const { docs, loading } = useCollection("chat_rag_documents", [orderBy("createdAt", "desc")]);
  const { addDocument, loading: adding } = useAddDoc("chat_rag_documents");
  const { updateDocument, loading: updating } = useUpdateDoc("chat_rag_documents");
  const { deleteDocument } = useDeleteDoc("chat_rag_documents");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<RagDoc | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [langFilter, setLangFilter] = useState<LangFilter>("all");
  const [search, setSearch] = useState("");

  const ragDocs = docs as unknown as RagDoc[];

  const filtered = useMemo(() => {
    let result = ragDocs;
    if (langFilter !== "all") {
      result = result.filter(
        (d) => detectLanguage(`${d.title} ${d.content}`) === langFilter
      );
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.content?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [ragDocs, langFilter, search]);

  const openCreate = () => {
    setEditingDoc(null);
    setTitle("");
    setContent("");
    setCategory("");
    setDialogOpen(true);
  };

  const openEdit = (doc: RagDoc) => {
    setEditingDoc(doc);
    setTitle(doc.title);
    setContent(doc.content);
    setCategory(doc.category || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    try {
      const data = { title: title.trim(), content: content.trim(), category: category.trim(), isActive: true };
      if (editingDoc) {
        await updateDocument(editingDoc.id, data);
        toast.success("ドキュメントを更新しました");
      } else {
        await addDocument(data);
        toast.success("ドキュメントを追加しました");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error("保存に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このドキュメントを削除しますか？")) return;
    try {
      await deleteDocument(id);
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RAG ドキュメント</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI応答の知識ベースを管理（保存時に自動でEmbedding生成）
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            新規追加
          </Button>
        </div>

        {/* フィルター */}
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <div className="flex gap-1">
            {LANG_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setLangFilter(f.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  langFilter === f.key
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} / {ragDocs.length} 件
          </span>
        </div>

        {/* ドキュメントリスト */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>ドキュメントがありません</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="border rounded-lg p-4 hover:border-black/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                      {doc.category && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {doc.category}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        <Globe className="w-3 h-3 inline mr-0.5" />
                        {detectLanguage(`${doc.title} ${doc.content}`).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {doc.content}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(doc)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 作成/編集ダイアログ */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? "ドキュメントを編集" : "新規ドキュメント"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>タイトル</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: eSIMインストール手順（iPhone）"
                />
              </div>
              <div>
                <Label>カテゴリ</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="例: setup, troubleshoot, billing"
                />
              </div>
              <div>
                <Label>コンテンツ</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="AIが参照する知識ベースの内容..."
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                💡 保存すると自動的に Gemini Embedding が生成され、ベクトル検索で利用可能になります。
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSave}
                disabled={!title.trim() || !content.trim() || adding || updating}
              >
                {(adding || updating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingDoc ? "更新" : "追加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
