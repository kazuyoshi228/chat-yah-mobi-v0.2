import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

export default function AdminQuickReplies() {
  const { user } = useAuth();
  const { data: quickReplies, refetch, isLoading } = trpc.admin.listQuickReplies.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const createQR = trpc.admin.createQuickReply.useMutation({
    onSuccess: () => { toast.success("Quick reply added"); refetch(); resetForm(); },
    onError: () => toast.error("Failed to add"),
  });

  const updateQR = trpc.admin.updateQuickReply.useMutation({
    onSuccess: () => { toast.success("Quick reply updated"); refetch(); resetForm(); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteQR = trpc.admin.deleteQuickReply.useMutation({
    onSuccess: () => { toast.success("Quick reply deleted"); refetch(); },
    onError: () => toast.error("Failed to delete"),
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  const handleEdit = (qr: { id: number; title: string; content: string }) => {
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

  if (user?.role !== "admin") {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="p-6 text-gray-500">Admin access required</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src="/manus-storage/yah-mobile-logo-horizontal_f116360c.svg"
              alt="yah.mobile"
              className="h-8 w-auto object-contain"
            />
            <h1 className="text-xl font-semibold text-gray-900">Quick Replies</h1>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-black hover:bg-gray-800 text-white gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2">
            {!quickReplies || quickReplies.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No quick replies found</p>
              </div>
            ) : (
              quickReplies.map((qr) => (
                <div
                  key={qr.id}
                  className="bg-white border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{qr.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{qr.content}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(qr)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteQR.mutate({ id: qr.id })}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Quick Reply" : "Add Quick Reply"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Greeting"
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter quick reply content..."
                rows={4}
                className="border-gray-200 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} className="border-gray-200">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || createQR.isPending || updateQR.isPending}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {createQR.isPending || updateQR.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
