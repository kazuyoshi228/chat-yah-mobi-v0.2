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
import { ChevronRight, Plus, Pencil, Trash2, GitBranch, RefreshCw } from "lucide-react";

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

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  question: "質問分岐",
  answer: "回答表示",
  redirect_form: "フォーム誘導",
  redirect_ai: "AIチャット誘導",
};

const NODE_TYPE_COLORS: Record<NodeType, string> = {
  question: "bg-blue-100 text-blue-800",
  answer: "bg-green-100 text-green-800",
  redirect_form: "bg-orange-100 text-orange-800",
  redirect_ai: "bg-purple-100 text-purple-800",
};

function parseLabel(labelJson: string): { ja?: string; en?: string } {
  try {
    return JSON.parse(labelJson);
  } catch {
    return { ja: labelJson, en: labelJson };
  }
}

function buildNodeForm(node?: FlowNode): NodeFormState {
  if (!node) {
    return {
      id: "",
      parentId: "",
      type: "question",
      label_ja: "",
      label_en: "",
      content_ja: "",
      content_en: "",
      icon: "",
      formTrigger: false,
      aiTrigger: false,
      sortOrder: 0,
      isActive: true,
    };
  }
  const label = parseLabel(node.label);
  let content_ja = "";
  let content_en = "";
  if (node.content) {
    try {
      const c = JSON.parse(node.content);
      content_ja = c.ja ?? "";
      content_en = c.en ?? "";
    } catch {
      content_ja = node.content;
    }
  }
  return {
    id: node.id,
    parentId: node.parentId ?? "",
    type: node.type,
    label_ja: label.ja ?? "",
    label_en: label.en ?? "",
    content_ja,
    content_en,
    icon: node.icon ?? "",
    formTrigger: (node.formTrigger ?? 0) === 1,
    aiTrigger: (node.aiTrigger ?? 0) === 1,
    sortOrder: node.sortOrder ?? 0,
    isActive: (node.isActive ?? 1) === 1,
  };
}

function NodeRow({
  node,
  depth,
  children,
  onEdit,
  onDeactivate,
}: {
  node: FlowNode;
  depth: number;
  children?: FlowNode[];
  onEdit: (node: FlowNode) => void;
  onDeactivate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const label = parseLabel(node.label);
  const isInactive = (node.isActive ?? 1) === 0;

  return (
    <div className={`${depth > 0 ? "ml-6 border-l border-border pl-4" : ""}`}>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg mb-1 group transition-colors ${
          isInactive ? "opacity-40" : "hover:bg-muted/50"
        }`}
      >
        {children && children.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}

        <span className="text-lg leading-none">{node.icon ?? "📌"}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {label.ja ?? label.en ?? node.id}
            </span>
            <Badge className={`text-xs ${NODE_TYPE_COLORS[node.type]}`} variant="outline">
              {NODE_TYPE_LABELS[node.type]}
            </Badge>
            {isInactive && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                無効
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{node.id}</div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(node)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!isInactive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDeactivate(node.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {expanded && children && children.length > 0 && (
        <div>
          {children.map((child) => (
            <ChildNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Recursive child renderer (needs access to all nodes for deeper nesting)
function ChildNodeRow({
  node,
  depth,
  onEdit,
  onDeactivate,
}: {
  node: FlowNode;
  depth: number;
  onEdit: (node: FlowNode) => void;
  onDeactivate: (id: string) => void;
}) {
  return (
    <NodeRow
      node={node}
      depth={depth}
      onEdit={onEdit}
      onDeactivate={onDeactivate}
    />
  );
}

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

  // Build tree: root nodes (no parentId) → children
  const rootNodes = useMemo(
    () => nodes.filter((n) => !n.parentId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) as FlowNode[],
    [nodes]
  );
  const childrenOf = useMemo(() => {
    const map: Record<string, FlowNode[]> = {};
    for (const n of nodes) {
      if (n.parentId) {
        if (!map[n.parentId]) map[n.parentId] = [];
        map[n.parentId].push(n as FlowNode);
      }
    }
    return map;
  }, [nodes]);

  function openCreate() {
    setForm(buildNodeForm());
    setDialogOpen(true);
  }

  function openEdit(node: FlowNode) {
    setForm(buildNodeForm(node));
    setDialogOpen(true);
  }

  function handleDeactivate(id: string) {
    if (!confirm(`ノード「${id}」を無効化しますか？\n（チャットウィジェットに表示されなくなります）`)) return;
    deactivateMutation.mutate({ id });
  }

  function handleSave() {
    if (!form.id.trim()) {
      toast.error("ノードIDは必須です");
      return;
    }
    if (!form.label_ja.trim() && !form.label_en.trim()) {
      toast.error("日本語または英語のラベルを入力してください");
      return;
    }
    const label = JSON.stringify({
      ja: form.label_ja,
      en: form.label_en,
      ko: form.label_ja, // default to JA for other languages
      zh: form.label_ja,
      th: form.label_ja,
      vi: form.label_ja,
    });
    const content =
      form.content_ja || form.content_en
        ? JSON.stringify({
            ja: form.content_ja,
            en: form.content_en,
            ko: form.content_ja,
            zh: form.content_ja,
            th: form.content_ja,
            vi: form.content_ja,
          })
        : null;
    upsertMutation.mutate({
      id: form.id.trim(),
      parentId: form.parentId.trim() || null,
      type: form.type,
      label,
      content,
      icon: form.icon.trim() || null,
      formTrigger: form.formTrigger ? 1 : 0,
      aiTrigger: form.aiTrigger ? 1 : 0,
      sortOrder: form.sortOrder,
      isActive: form.isActive ? 1 : 0,
    });
  }

  const activeCount = nodes.filter((n) => (n.isActive ?? 1) === 1).length;
  const inactiveCount = nodes.filter((n) => (n.isActive ?? 1) === 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            デシジョンツリー管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            チャットウィジェットの選択肢フローを管理します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => utils.admin.listFlowNodes.invalidate()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            ノード追加
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{nodes.length}</div>
            <div className="text-sm text-muted-foreground">総ノード数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-sm text-muted-foreground">有効ノード</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-muted-foreground">{inactiveCount}</div>
            <div className="text-sm text-muted-foreground">無効ノード</div>
          </CardContent>
        </Card>
      </div>

      {/* Tree View */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ツリー構造</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : rootNodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ノードがありません。「ノード追加」から作成してください。
            </div>
          ) : (
            <div className="space-y-1">
              {rootNodes.map((node) => (
                <NodeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  children={childrenOf[node.id]}
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
            <DialogTitle>{form.id ? "ノード編集" : "ノード追加"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ID & Parent */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ノードID <span className="text-destructive">*</span></Label>
                <Input
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="例: connection_iphone_before"
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
                    {nodes
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
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as NodeType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

            {/* Content (for answer nodes) */}
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
                <Switch
                  checked={form.formTrigger}
                  onCheckedChange={(v) => setForm({ ...form, formTrigger: v })}
                />
                <Label>フォーム誘導</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.aiTrigger}
                  onCheckedChange={(v) => setForm({ ...form, aiTrigger: v })}
                />
                <Label>AIチャット誘導</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label>有効</Label>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
