import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ChevronRight, Plus, Pencil, Trash2, GitBranch, RefreshCw, ChevronsDownUp, ChevronsUpDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType = "question" | "answer" | "redirect_form" | "redirect_ai";

interface FlowNode {
  id: string;
  parentId: string | null;
  type: NodeType;
  label: string;
  content: string | null;
  options: string | null;
  icon: string | null;
  formTrigger: number | null;
  aiTrigger: number | null;
  sortOrder: number | null;
  isActive: number | null;
  createdAt: Date;
}

interface NodeFormState {
  id: string;
  parentId: string;
  type: NodeType;
  label_ja: string;
  label_en: string;
  content_ja: string;
  content_en: string;
  icon: string;
  formTrigger: boolean;
  aiTrigger: boolean;
  sortOrder: number;
  isActive: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  question: "質問分岐",
  answer: "回答表示",
  redirect_form: "フォーム誘導",
  redirect_ai: "AIチャット誘導",
};

const NODE_TYPE_COLORS: Record<NodeType, string> = {
  question:      "bg-blue-50   text-blue-700   border-blue-200",
  answer:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  redirect_form: "bg-orange-50 text-orange-700 border-orange-200",
  redirect_ai:   "bg-purple-50 text-purple-700 border-purple-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseLabel(labelJson: string): { ja?: string; en?: string } {
  try { return JSON.parse(labelJson); }
  catch { return { ja: labelJson, en: labelJson }; }
}

function buildNodeForm(node?: FlowNode): NodeFormState {
  if (!node) {
    return { id: "", parentId: "", type: "question", label_ja: "", label_en: "",
      content_ja: "", content_en: "", icon: "", formTrigger: false, aiTrigger: false,
      sortOrder: 0, isActive: true };
  }
  const label = parseLabel(node.label);
  let content_ja = "", content_en = "";
  if (node.content) {
    try { const c = JSON.parse(node.content); content_ja = c.ja ?? ""; content_en = c.en ?? ""; }
    catch { content_ja = node.content; }
  }
  return {
    id: node.id, parentId: node.parentId ?? "", type: node.type,
    label_ja: label.ja ?? "", label_en: label.en ?? "",
    content_ja, content_en, icon: node.icon ?? "",
    formTrigger: (node.formTrigger ?? 0) === 1,
    aiTrigger: (node.aiTrigger ?? 0) === 1,
    sortOrder: node.sortOrder ?? 0,
    isActive: (node.isActive ?? 1) === 1,
  };
}

// ─── Recursive Node Row ───────────────────────────────────────────────────────

function NodeRow({
  node,
  depth,
  childrenOf,
  expandAll,
  onEdit,
  onDeactivate,
}: {
  node: FlowNode;
  depth: number;
  childrenOf: Record<string, FlowNode[]>;
  expandAll: boolean;
  onEdit: (node: FlowNode) => void;
  onDeactivate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const label = parseLabel(node.label);
  const isInactive = (node.isActive ?? 1) === 0;
  const children = (childrenOf[node.id] ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const hasChildren = children.length > 0;

  // Sync with expandAll toggle
  const isExpanded = expandAll ? true : expanded;

  const depthColors = [
    "border-slate-200",
    "border-blue-200",
    "border-emerald-200",
    "border-amber-200",
    "border-purple-200",
  ];
  const borderColor = depthColors[Math.min(depth, depthColors.length - 1)];

  return (
    <div className={depth > 0 ? `ml-5 border-l-2 ${borderColor} pl-3` : ""}>
      <div
        className={`flex items-center gap-2 py-2 px-2 rounded-lg mb-0.5 group transition-colors ${
          isInactive ? "opacity-40" : "hover:bg-muted/40"
        }`}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}

        {/* Icon */}
        <span className="text-base leading-none flex-shrink-0">{node.icon ?? "📌"}</span>

        {/* Label + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-medium text-sm ${isInactive ? "line-through" : ""}`}>
              {label.ja ?? label.en ?? node.id}
            </span>
            {label.en && label.en !== label.ja && (
              <span className="text-xs text-muted-foreground hidden sm:inline">/ {label.en}</span>
            )}
            <Badge className={`text-[10px] px-1.5 py-0 border ${NODE_TYPE_COLORS[node.type]}`} variant="outline">
              {NODE_TYPE_LABELS[node.type]}
            </Badge>
            {(node.formTrigger ?? 0) === 1 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200" variant="outline">
                フォーム
              </Badge>
            )}
            {(node.aiTrigger ?? 0) === 1 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-600 border-purple-200" variant="outline">
                AI
              </Badge>
            )}
            {hasChildren && (
              <span className="text-[10px] text-muted-foreground">({children.length})</span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{node.id}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(node)}>
            <Pencil className="h-3 w-3" />
          </Button>
          {!isInactive && (
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDeactivate(node.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Children — recursive */}
      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              childrenOf={childrenOf}
              expandAll={expandAll}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminFlowTree() {
  const utils = trpc.useUtils();
  const { data: nodes = [], isLoading } = trpc.admin.listFlowNodes.useQuery();
  const upsertMutation = trpc.admin.upsertFlowNode.useMutation({
    onSuccess: () => {
      utils.admin.listFlowNodes.invalidate();
      utils.admin.getChatFlowNodes.invalidate();
      toast.success("ノードを保存しました");
      setDialogOpen(false);
    },
    onError: (e) => toast.error(`保存失敗: ${e.message}`),
  });
  const deactivateMutation = trpc.admin.deactivateFlowNode.useMutation({
    onSuccess: () => {
      utils.admin.listFlowNodes.invalidate();
      utils.admin.getChatFlowNodes.invalidate();
      toast.success("ノードを無効化しました");
    },
    onError: (e) => toast.error(`無効化失敗: ${e.message}`),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NodeFormState>(buildNodeForm());
  const [expandAll, setExpandAll] = useState(true);

  // Build tree map: parentId → children[]
  const rootNodes = useMemo(
    () => (nodes as FlowNode[]).filter((n) => !n.parentId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [nodes]
  );
  const childrenOf = useMemo(() => {
    const map: Record<string, FlowNode[]> = {};
    for (const n of nodes as FlowNode[]) {
      if (n.parentId) {
        if (!map[n.parentId]) map[n.parentId] = [];
        map[n.parentId].push(n);
      }
    }
    return map;
  }, [nodes]);

  function openCreate() { setForm(buildNodeForm()); setDialogOpen(true); }
  function openEdit(node: FlowNode) { setForm(buildNodeForm(node)); setDialogOpen(true); }

  function handleDeactivate(id: string) {
    if (!confirm(`ノード「${id}」を無効化しますか？`)) return;
    deactivateMutation.mutate({ id });
  }

  function handleSave() {
    if (!form.id.trim()) { toast.error("ノードIDは必須です"); return; }
    if (!form.label_ja.trim() && !form.label_en.trim()) {
      toast.error("日本語または英語のラベルを入力してください"); return;
    }
    const label = JSON.stringify({ ja: form.label_ja, en: form.label_en,
      ko: form.label_ja, zh: form.label_ja, th: form.label_ja, vi: form.label_ja });
    const content = form.content_ja || form.content_en
      ? JSON.stringify({ ja: form.content_ja, en: form.content_en,
          ko: form.content_ja, zh: form.content_ja, th: form.content_ja, vi: form.content_ja })
      : null;
    upsertMutation.mutate({
      id: form.id.trim(), parentId: form.parentId.trim() || null, type: form.type,
      label, content, icon: form.icon.trim() || null,
      formTrigger: form.formTrigger ? 1 : 0, aiTrigger: form.aiTrigger ? 1 : 0,
      sortOrder: form.sortOrder, isActive: form.isActive ? 1 : 0,
    });
  }

  const activeCount   = (nodes as FlowNode[]).filter((n) => (n.isActive ?? 1) === 1).length;
  const inactiveCount = (nodes as FlowNode[]).filter((n) => (n.isActive ?? 1) === 0).length;
  const questionCount = (nodes as FlowNode[]).filter((n) => n.type === "question").length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            デシジョンツリー管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            チャットウィジェットの選択肢フローを管理します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => utils.admin.listFlowNodes.invalidate()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            更新
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            ノード追加
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "総ノード数",   value: nodes.length,   cls: "" },
          { label: "質問分岐",     value: questionCount,  cls: "text-blue-600" },
          { label: "有効ノード",   value: activeCount,    cls: "text-emerald-600" },
          { label: "無効ノード",   value: inactiveCount,  cls: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tree View */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">全分岐ツリー</CardTitle>
            <Button
              variant="ghost" size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setExpandAll(!expandAll)}
            >
              {expandAll
                ? <><ChevronsDownUp className="h-3.5 w-3.5 mr-1" />すべて折りたたむ</>
                : <><ChevronsUpDown className="h-3.5 w-3.5 mr-1" />すべて展開</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">読み込み中...</div>
          ) : rootNodes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              ノードがありません。「ノード追加」から作成してください。
            </div>
          ) : (
            <div className="space-y-0.5">
              {rootNodes.map((node) => (
                <NodeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  childrenOf={childrenOf}
                  expandAll={expandAll}
                  onEdit={openEdit}
                  onDeactivate={handleDeactivate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Node Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id && nodes.find((n) => n.id === form.id) ? "ノード編集" : "ノード追加"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ID & Parent */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ノードID <span className="text-destructive">*</span></Label>
                <Input
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="例: conn_iphone_step1"
                  disabled={!!nodes.find((n) => n.id === form.id) && form.id !== ""}
                />
                <p className="text-xs text-muted-foreground">英数字・アンダースコアのみ。一度設定すると変更不可。</p>
              </div>
              <div className="space-y-1.5">
                <Label>親ノードID</Label>
                <Select
                  value={form.parentId || "__root__"}
                  onValueChange={(v) => setForm({ ...form, parentId: v === "__root__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="（ルートノード）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">（ルートノード）</SelectItem>
                    {(nodes as FlowNode[])
                      .filter((n) => n.id !== form.id)
                      .map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.icon} {parseLabel(n.label).ja ?? n.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type & Icon */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ノードタイプ <span className="text-destructive">*</span></Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as NodeType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(NODE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>アイコン（絵文字）</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="例: 🔌"
                  maxLength={4}
                />
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-1.5">
              <Label>ラベル（日本語）<span className="text-destructive">*</span></Label>
              <Input
                value={form.label_ja}
                onChange={(e) => setForm({ ...form, label_ja: e.target.value })}
                placeholder="例: 接続・通信トラブル"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ラベル（英語）</Label>
              <Input
                value={form.label_en}
                onChange={(e) => setForm({ ...form, label_en: e.target.value })}
                placeholder="例: Connection Issues"
              />
            </div>

            {/* Content */}
            {(form.type === "answer" || form.type === "redirect_form") && (
              <>
                <div className="space-y-1.5">
                  <Label>回答内容（日本語）</Label>
                  <Textarea
                    value={form.content_ja}
                    onChange={(e) => setForm({ ...form, content_ja: e.target.value })}
                    placeholder="ユーザーに表示する解決策・説明文"
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>回答内容（英語）</Label>
                  <Textarea
                    value={form.content_en}
                    onChange={(e) => setForm({ ...form, content_en: e.target.value })}
                    placeholder="Solution text in English"
                    rows={4}
                  />
                </div>
              </>
            )}

            {/* Flags */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.formTrigger} onCheckedChange={(v) => setForm({ ...form, formTrigger: v })} />
                <Label className="text-sm">フォーム誘導</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.aiTrigger} onCheckedChange={(v) => setForm({ ...form, aiTrigger: v })} />
                <Label className="text-sm">AIチャット誘導</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label className="text-sm">有効</Label>
              </div>
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <Label>表示順（数値が小さいほど上位）</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
