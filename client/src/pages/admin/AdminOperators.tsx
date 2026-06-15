import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Shield } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  user: "User",
  operator: "Operator",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  user: "bg-gray-100 text-gray-600",
  operator: "bg-blue-100 text-blue-700",
  admin: "bg-black text-white",
};

export default function AdminOperators() {
  const { user } = useAuth();
  const { data: operators, refetch, isLoading } = trpc.admin.listOperators.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const setRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      refetch();
    },
    onError: () => toast.error("Failed to update role"),
  });

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
            <h1 className="text-xl font-semibold text-gray-900">Operator Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage user roles</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2">
            {!operators || operators.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No operators or admins found</p>
              </div>
            ) : (
              operators.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {op.name?.charAt(0).toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{op.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{op.email ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs border-0 ${ROLE_COLORS[op.role]}`}>
                      {ROLE_LABELS[op.role]}
                    </Badge>
                    {op.id !== user?.id && (
                      <Select
                        value={op.role}
                        onValueChange={(v) =>
                          setRole.mutate({ userId: op.id, role: v as "user" | "admin" | "operator" })
                        }
                      >
                        <SelectTrigger className="w-36 h-8 text-xs border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
