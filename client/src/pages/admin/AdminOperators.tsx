import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Users,
  Plus,
  Mail,
  Hash,
  Calendar,
  MessageSquare,
  Fingerprint,
  Pencil,
  Trash2,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

const ROLE_COLORS: Record<string, string> = {
  operator: "bg-blue-50 text-blue-700 border-blue-100",
  admin: "bg-gray-900 text-white border-gray-900",
  user: "bg-gray-100 text-gray-600 border-gray-200",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  operator: <UserCog className="w-3 h-3" />,
  admin: <ShieldCheck className="w-3 h-3" />,
  user: <Users className="w-3 h-3" />,
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface OperatorFormData {
  firstName: string;
  lastName: string;
  email: string;
}

interface AddOperatorDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddOperatorDialog({ open, onClose, onSuccess }: AddOperatorDialogProps) {
  const [form, setForm] = useState<OperatorFormData>({ firstName: "", lastName: "", email: "" });
  const [errors, setErrors] = useState<Partial<OperatorFormData>>({});

  const createOp = trpc.admin.createOperator.useMutation({
    onSuccess: () => {
      toast.success("Operator added successfully");
      setForm({ firstName: "", lastName: "", email: "" });
      setErrors({});
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message ?? "Failed to add operator"),
  });

  function validate() {
    const errs: Partial<OperatorFormData> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createOp.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add New Operator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-medium text-gray-700">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="e.g. Taro"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className={errors.firstName ? "border-red-400" : ""}
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-medium text-gray-700">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="e.g. Yamada"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className={errors.lastName ? "border-red-400" : ""}
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="operator@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={errors.email ? "border-red-400" : ""}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            A new operator account will be created. The operator can log in via the Staff Portal using their Manus account linked to this email.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={createOp.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={createOp.isPending}>
            {createOp.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Add Operator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditOperatorDialogProps {
  open: boolean;
  operator: { id: number; firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  onClose: () => void;
  onSuccess: () => void;
}

function EditOperatorDialog({ open, operator, onClose, onSuccess }: EditOperatorDialogProps) {
  const [form, setForm] = useState<OperatorFormData>({
    firstName: operator?.firstName ?? "",
    lastName: operator?.lastName ?? "",
    email: operator?.email ?? "",
  });
  const [errors, setErrors] = useState<Partial<OperatorFormData>>({});

  // Sync form when operator changes
  useState(() => {
    setForm({
      firstName: operator?.firstName ?? "",
      lastName: operator?.lastName ?? "",
      email: operator?.email ?? "",
    });
  });

  const updateOp = trpc.admin.updateOperator.useMutation({
    onSuccess: () => {
      toast.success("Operator updated");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message ?? "Failed to update operator"),
  });

  function validate() {
    const errs: Partial<OperatorFormData> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!operator || !validate()) return;
    updateOp.mutate({ userId: operator.id, ...form });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Edit Operator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName" className="text-xs font-medium text-gray-700">First Name</Label>
              <Input
                id="edit-firstName"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className={errors.firstName ? "border-red-400" : ""}
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName" className="text-xs font-medium text-gray-700">Last Name</Label>
              <Input
                id="edit-lastName"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className={errors.lastName ? "border-red-400" : ""}
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email" className="text-xs font-medium text-gray-700">Email Address</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={errors.email ? "border-red-400" : ""}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={updateOp.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={updateOp.isPending}>
            {updateOp.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Pencil className="w-4 h-4 mr-1.5" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminOperators() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: operators, isLoading } = trpc.admin.listOperators.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const [showAdd, setShowAdd] = useState(false);
  type OperatorItem = NonNullable<typeof operators>[number];
  const [editTarget, setEditTarget] = useState<OperatorItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const deleteOp = trpc.admin.deleteOperator.useMutation({
    onSuccess: () => {
      toast.success("Operator removed");
      utils.admin.listOperators.invalidate();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message ?? "Failed to remove operator"),
  });

  function handleRefresh() {
    utils.admin.listOperators.invalidate();
  }

  if (user?.role !== "admin") {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="p-6 text-gray-500">Admin access required</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="p-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src="/manus-storage/yah-mobile-logo-horizontal_62d76ed8.svg"
              alt="yah.mobile"
              className="h-8 w-auto object-contain"
            />
            <h1 className="text-xl font-semibold text-gray-900">Operator Management</h1>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Operator
          </Button>
        </div>

        {/* Card Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : !operators || operators.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No operators found</p>
            <p className="text-xs mt-1">Add your first operator to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {operators.map((op) => {
              const initials = [op.firstName, op.lastName]
                .filter(Boolean)
                .map((s) => s!.charAt(0).toUpperCase())
                .join("") || op.name?.charAt(0).toUpperCase() || "?";
              const displayName =
                op.firstName || op.lastName
                  ? `${op.firstName ?? ""} ${op.lastName ?? ""}`.trim()
                  : op.name ?? "—";

              return (
                <div
                  key={op.id}
                  className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Top row: avatar + name + role badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-gray-700">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                        <p className="text-xs text-gray-400 truncate">{op.email ?? "—"}</p>
                      </div>
                    </div>
                    <Badge
                      className={`text-xs border shrink-0 flex items-center gap-1 ${ROLE_COLORS[op.role]}`}
                    >
                      {ROLE_ICONS[op.role]}
                      {op.role.charAt(0).toUpperCase() + op.role.slice(1)}
                    </Badge>
                  </div>

                  {/* Detail rows */}
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <span className="text-gray-400">Operator ID:</span>
                      <span className="font-mono text-gray-700">{op.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <span className="text-gray-400">Open ID:</span>
                      <span className="font-mono text-gray-700 truncate max-w-[140px]" title={op.openId}>
                        {op.openId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <span className="text-gray-400">Email:</span>
                      <span className="text-gray-700 truncate">{op.email ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <span className="text-gray-400">Chats handled:</span>
                      <span className="text-gray-700 font-medium">{(op as any).chatCount ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <span className="text-gray-400">Joined:</span>
                      <span className="text-gray-700">{formatDate(op.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <span className="text-gray-400">Last sign-in:</span>
                      <span className="text-gray-700">{formatDate(op.lastSignedIn)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {op.id !== user?.id && (
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1"
                        onClick={() => setEditTarget(op as any)}
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:border-red-200"
                        onClick={() =>
                          setDeleteTarget({
                            id: op.id,
                            name: displayName,
                          })
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </Button>
                    </div>
                  )}
                  {op.id === user?.id && (
                    <div className="pt-1 border-t border-gray-50">
                      <p className="text-xs text-gray-400 text-center">You (current admin)</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Operator Dialog */}
      <AddOperatorDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleRefresh}
      />

      {/* Edit Operator Dialog */}
      <EditOperatorDialog
        open={!!editTarget}
        operator={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={handleRefresh}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Operator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong> as an operator?
              Their account will be downgraded to a regular user. This action can be undone by re-adding them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteTarget && deleteOp.mutate({ userId: deleteTarget.id })}
            >
              {deleteOp.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
