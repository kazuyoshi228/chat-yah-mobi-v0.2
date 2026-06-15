import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, BookOpen, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function isExpiringSoon(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return d > now && d.getTime() - now.getTime() < thirtyDays;
}

export default function AdminRag() {
  const { user } = useAuth();
  const { data: docs, refetch, isLoading } = trpc.admin.listRagDocuments.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState(""); // date input value (YYYY-MM-DD)

  const createDoc = trpc.admin.createRagDocument.useMutation({
    onSuccess: () => { toast.success("Document added"); refetch(); resetForm(); },
    onError: () => toast.error("Failed to add"),
  });

  const updateDoc = trpc.admin.updateRagDocument.useMutation({
    onSuccess: () => { toast.success("Document updated"); refetch(); resetForm(); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteDoc = trpc.admin.deleteRagDocument.useMutation({
    onSuccess: () => { toast.success("Document deleted"); refetch(); },
    onError: () => toast.error("Failed to delete"),
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setExpiresAt("");
  };

  const handleEdit = (doc: { id: number; title: string; content: string; expiresAt?: Date | string | null }) => {
    setEditingId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
    // Convert to YYYY-MM-DD for date input
    setExpiresAt(doc.expiresAt ? new Date(doc.expiresAt).toISOString().split("T")[0] : "");
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    // Convert date string to ISO 8601 or null
    const expiresAtISO = expiresAt ? new Date(expiresAt + "T23:59:59Z").toISOString() : undefined;
    if (editingId) {
      updateDoc.mutate({ id: editingId, title, content, expiresAt: expiresAtISO ?? null });
    } else {
      createDoc.mutate({ title, content, expiresAt: expiresAtISO });
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
          <div>
            <h1 className="text-xl font-semibold text-gray-900">RAG Documents</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage the AI knowledge base</p>
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
            {!docs || docs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No documents found</p>
                <p className="text-xs mt-1">Add FAQs and product info to improve AI answer accuracy</p>
              </div>
            ) : (
              docs.map((doc) => {
                const expired = isExpired(doc.expiresAt);
                const expiringSoon = isExpiringSoon(doc.expiresAt);
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "bg-white border rounded-xl p-4 flex items-start justify-between gap-3",
                      expired ? "border-red-200 bg-red-50/30" : "border-gray-100"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                        {expired && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Expired (excluded from AI search)
                          </span>
                        )}
                        {!expired && expiringSoon && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            Expiring soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-3">{doc.content}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs text-gray-300">
                          Created: {new Date(doc.createdAt).toLocaleDateString("en-US")}
                        </p>
                        {doc.expiresAt && (
                          <p className={cn("text-xs", expired ? "text-red-400" : expiringSoon ? "text-amber-500" : "text-gray-300")}>
                            Expires: {new Date(doc.expiresAt).toLocaleDateString("en-US")}
                          </p>
                        )}
                      </div>
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
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Document" : "Add Document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Return Policy"
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter document content for AI to reference..."
                rows={8}
                className="border-gray-200 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Expiry Date (optional)
              </Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="border-gray-200"
              />
              <p className="text-xs text-gray-400">
                After this date, the document will be excluded from AI search. Leave blank for no expiry.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} className="border-gray-200">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || createDoc.isPending || updateDoc.isPending}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {createDoc.isPending || updateDoc.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
