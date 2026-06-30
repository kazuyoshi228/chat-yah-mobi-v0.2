/**
 * HospitalityFirebase — ホスピタリティ基準管理（Firestore版）
 * AI system prompt に注入される基準を管理
 */
import { useState } from "react";
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
import { Loader2, Plus, Pencil, Trash2, Heart, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Guideline {
  id: string;
  title: string;
  content: string;
  priority: number;
  isActive: boolean;
  createdAt?: unknown;
}

export default function HospitalityFirebase() {
  const { docs, loading } = useCollection("hospitalityGuidelines", [orderBy("priority", "asc")]);
  const { addDocument, loading: adding } = useAddDoc("hospitalityGuidelines");
  const { updateDocument, loading: updating } = useUpdateDoc("hospitalityGuidelines");
  const { deleteDocument } = useDeleteDoc("hospitalityGuidelines");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Guideline | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState(0);

  const guidelines = docs as unknown as Guideline[];
  const activeCount = guidelines.filter((g) => g.isActive).length;

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setPriority(guidelines.length + 1);
    setDialogOpen(true);
  };

  const openEdit = (g: Guideline) => {
    setEditing(g);
    setTitle(g.title);
    setContent(g.content);
    setPriority(g.priority);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    try {
      const data = { title: title.trim(), content: content.trim(), priority, isActive: true };
      if (editing) {
        await updateDocument(editing.id, data);
        toast.success("基準を更新しました");
      } else {
        await addDocument(data);
        toast.success("基準を追加しました");
      }
      setDialogOpen(false);
    } catch {
      toast.error("保存に失敗しました");
    }
  };

  const toggleActive = async (g: Guideline) => {
    try {
      await updateDocument(g.id, { isActive: !g.isActive });
      toast.success(g.isActive ? "無効化しました" : "有効化しました");
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この基準を削除しますか？")) return;
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
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500" />
              ホスピタリティ基準
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI応答の品質基準。有効な基準は Gemini system prompt に自動注入されます。
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            新規追加
          </Button>
        </div>

        {/* ステータスバー */}
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            全 {guidelines.length} 件
          </span>
          <span className="text-green-600 font-medium">
            ✅ 有効: {activeCount}
          </span>
          <span className="text-muted-foreground">
            ⏸ 無効: {guidelines.length - activeCount}
          </span>
        </div>

        {/* ガイドラインリスト */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : guidelines.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>ホスピタリティ基準が未設定です</p>
            <p className="text-xs mt-1">
              追加すると AI の応答品質が向上します
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {guidelines.map((g, i) => (
              <div
                key={g.id}
                className={cn(
                  "border rounded-lg p-4 transition-colors",
                  g.isActive
                    ? "border-green-200 bg-green-50/30"
                    : "border-gray-200 opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0 pt-0.5">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-xs font-mono w-6 text-center">
                      #{g.priority}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{g.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                      {g.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(g)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title={g.isActive ? "無効化" : "有効化"}
                    >
                      {g.isActive ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}>
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
                {editing ? "基準を編集" : "新規ホスピタリティ基準"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>タイトル</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 3ステップ・オブ・サービス"
                />
              </div>
              <div>
                <Label>優先度（小さいほど優先）</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <Label>基準内容</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="AIが遵守すべきサービス基準を記述..."
                  rows={10}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                💡 有効化すると、onVisitorMessageCreated トリガーが自動的にこの基準を Gemini の system prompt に注入します。
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleSave}
                disabled={!title.trim() || !content.trim() || adding || updating}
              >
                {(adding || updating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editing ? "更新" : "追加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
