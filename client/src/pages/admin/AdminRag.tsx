import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function AdminRag() {
  const { user } = useAuth();
  const { data: docs, refetch, isLoading } = trpc.admin.listRagDocuments.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const createDoc = trpc.admin.createRagDocument.useMutation({
    onSuccess: () => { toast.success("ドキュメントを追加しました"); refetch(); resetForm(); },
    onError: () => toast.error("追加に失敗しました"),
  });

  const updateDoc = trpc.admin.updateRagDocument.useMutation({
    onSuccess: () => { toast.success("ドキュメントを更新しました"); refetch(); resetForm(); },
    onError: () => toast.error("更新に失敗しました"),
  });

  const deleteDoc = trpc.admin.deleteRagDocument.useMutation({
    onSuccess: () => { toast.success("ドキュメントを削除しました"); refetch(); },
    onError: () => toast.error("削除に失敗しました"),
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  const handleEdit = (doc: { id: number; title: string; content: string }) => {
    setEditingId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    if (editingId) {
      updateDoc.mutate({ id: editingId, title, content });
    } else {
      createDoc.mutate({ title, content });
    }
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout title="管理ダッシュボード">
        <div className="p-6 text-gray-500">管理者権限が必要です</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="管理ダッシュボード">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">RAGドキュメント</h1>
            <p className="text-sm text-gray-400 mt-0.5">AIが参照する知識ベースを管理します</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-black hover:bg-gray-800 text-white gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            追加
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2">
            {!docs || docs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">ドキュメントはありません</p>
                <p className="text-xs mt-1">FAQや製品情報を追加してAIの回答精度を上げましょう</p>
              </div>
            ) : (
              docs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-3">{doc.content}</p>
                    <p className="text-xs text-gray-300 mt-1.5">
                      {new Date(doc.createdAt).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(doc)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteDoc.mutate({ id: doc.id })}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "ドキュメントを編集" : "ドキュメントを追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">タイトル</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 返品ポリシー"
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">内容</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="AIが参照するドキュメントの内容を入力..."
                rows={8}
                className="border-gray-200 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} className="border-gray-200">
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || createDoc.isPending || updateDoc.isPending}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {createDoc.isPending || updateDoc.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingId ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
