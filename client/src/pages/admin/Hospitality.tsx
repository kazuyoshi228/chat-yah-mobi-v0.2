import DashboardLayout from "@/components/DashboardLayout";

export default function Hospitality() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hospitality</h1>
          <p className="text-sm text-muted-foreground mt-1">ホスピタリティ管理</p>
        </div>
        <div className="flex items-center justify-center h-64 border border-dashed rounded-lg text-muted-foreground text-sm">
          Coming soon
        </div>
      </div>
    </DashboardLayout>
  );
}
