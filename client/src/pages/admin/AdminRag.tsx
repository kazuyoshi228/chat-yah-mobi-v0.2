import { YahLogo } from "@/components/YahLogo";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, BookOpen, Clock, AlertTriangle, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Language detection (client-side heuristic) ─────────────────────────────
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
  // Check first 200 chars of title+content for dominant script
  const sample = text.slice(0, 200);
  const ja = (sample.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  const zh = (sample.match(/[\u4E00-\u9FFF]/g) || []).length;
  const ko = (sample.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  const th = (sample.match(/[\u0E00-\u0E7F]/g) || []).length;
  const vi = (sample.match(/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi) || []).length;

  // If Japanese kana detected, it's Japanese (even if kanji present)
  if (ja >= 3) return "ja";
  // Korean
  if (ko >= 3) return "ko";
  // Thai
  if (th >= 3) return "th";
  // Vietnamese (Latin-based with diacritics)
  if (vi >= 3) return "vi";
  // Chinese (kanji without kana)
  if (zh >= 5 && ja === 0) return "zh";
  // Check if mostly ASCII/Latin → English
  const ascii = (sample.match(/[a-zA-Z]/g) || []).length;
  if (ascii > sample.length * 0.4) return "en";
  // If has kanji but also some kana → Japanese
  if (zh >= 2 && ja >= 1) return "ja";
  if (zh >= 3) return "zh";

  return "other";
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function isExpiringSoon(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  const now = new Date();
  return d > now && d.getTime() - now.getTime() < 30 * 86400000;
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function AdminRag() {
  const { user } = useAuth();
  const { data: docs, refetch, isLoading } = trpc.admin.listRagDocuments.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [langFilter, setLangFilter] = useState<LangFilter>("all");

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
    setExpiresAt(doc.expiresAt ? new Date(doc.expiresAt).toISOString().split("T")[0] : "");
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    const expiresAtISO = expiresAt ? new Date(expiresAt + "T23:59:59Z").toISOString() : undefined;
    if (editingId) {
      updateDoc.mutate({ id: editingId, title, content, expiresAt: expiresAtISO ?? null });
    } else {
      createDoc.mutate({ title, content, expiresAt: expiresAtISO });
    }
  };

  // Filter docs by detected language
  const filteredDocs = useMemo(() => {
    if (!docs) return [];
    if (langFilter === "all") return docs;
    return docs.filter((doc) => detectLanguage(doc.title + " " + doc.content) === langFilter);
  }, [docs, langFilter]);

  // Count per language for badges
  const langCounts = useMemo(() => {
    if (!docs) return {};
    const counts: Record<string, number> = {};
    docs.forEach((doc) => {
      const lang = detectLanguage(doc.title + " " + doc.content);
      counts[lang] = (counts[lang] || 0) + 1;
    });
    return counts;
  }, [docs]);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <YahLogo height={32} className="text-black" />
            <h1 className="text-xl font-semibold text-gray-900">RAG Documents</h1>
            {docs && <span className="text-xs text-muted-foreground">{docs.length} docs</span>}
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-black hover:bg-gray-800 text-white gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {/* Language filter buttons */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex gap-1">
            {LANG_FILTERS.map((f) => {
              const count = f.key === "all" ? (docs?.length ?? 0) : (langCounts[f.key] ?? 0);
              const isActive = langFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setLangFilter(f.key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap border",
                    isActive
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  )}
                >
                  {f.label}
                  {count > 0 && (
                    <span className={cn("ml-1.5 text-[10px] tabular-nums", isActive ? "text-white/70" : "text-gray-400")}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Document list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{langFilter === "all" ? "No documents found" : `No ${LANG_FILTERS.find(f => f.key === langFilter)?.label} documents`}</p>
                <p className="text-xs mt-1">Add FAQs and product info to improve AI answer accuracy</p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const expired = isExpired(doc.expiresAt);
                const expiringSoon = isExpiringSoon(doc.expiresAt);
                const lang = detectLanguage(doc.title + " " + doc.content);
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 font-mono">
                          {lang}
                        </span>
                        {expired && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Expired
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
                    <div className="flex items-center gap-1 shrink-0">
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
                After this date, the document will be excluded from AI search.
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
