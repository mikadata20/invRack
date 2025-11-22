import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import BomMasterHeader from "@/components/bom-master/BomMasterHeader.tsx";
import BomTable from "@/components/bom-master/BomTable.tsx";
import BomFormDialog, { BomData } from "@/components/bom-master/BomFormDialog.tsx";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

const BomMaster = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useUserRole();
  const [boms, setBoms] = useState<BomData[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<BomData | null>(null);

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate("/auth");
    } else if (profile) {
      fetchBoms();
      
      // Setup realtime subscription
      const channel = supabase
        .channel('bom_master_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bom_master'
          },
          (payload) => {
            console.log('BOM master change:', payload);
            fetchBoms(); // Refresh BOMs on any change
            
            if (payload.eventType === 'INSERT') {
              toast.info('New BOM added', {
                description: payload.new.part_name
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authLoading, profile, navigate]);

  const fetchBoms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bom_master")
        .select("*")
        .order("unix_no", { ascending: true });

      if (error) throw error;
      setBoms((data as BomData[]) || []);
    } catch (error: any) {
      toast.error("Error loading BOM data", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingBom(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (bom: BomData) => {
    setEditingBom(bom);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (data: BomData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.email || "Unknown";

      if (editingBom?.id) {
        const { error } = await (supabase
          .from("bom_master")
          .update as any)({ ...data, updated_at: new Date().toISOString() }) // Cast to any
          .eq("id", editingBom.id);
        if (error) throw error;

        // Log activity
        const activityLogPayload: TablesInsert<'activity_log'> = {
          table_name: "bom_master",
          action_type: "UPDATE",
          record_id: editingBom.id.toString(),
          user_id: user?.id || null,
          username: username,
          description: `Updated BOM: ${data.part_name}`,
          old_data: editingBom as any,
          new_data: data as any,
        };
        await (supabase.from("activity_log").insert as any)([activityLogPayload]); // Cast to any

        toast.success("BOM updated successfully.");
      } else {
        const { error } = await (supabase
          .from("bom_master")
          .insert as any)({ ...data, created_by: user?.id || null }); // Cast to any
        if (error) throw error;

        // Log activity
        const activityLogPayload: TablesInsert<'activity_log'> = {
          table_name: "bom_master",
          action_type: "INSERT",
          record_id: data.unix_no, // Use unix_no as record_id for new inserts
          user_id: user?.id || null,
          username: username,
          description: `Added new BOM: ${data.part_name}`,
          new_data: data as any,
        };
        await (supabase.from("activity_log").insert as any)([activityLogPayload]); // Cast to any

        toast.success("BOM added successfully.");
      }
      fetchBoms();
      return true;
    } catch (error: any) {
      toast.error("Error saving BOM", { description: error.message });
      return false;
    }
  };

  const handleDelete = async (id: number, unix_no: string) => {
    if (!profile || !profile.role || !['admin'].includes(profile.role)) {
      toast.error("Only admin can delete BOM");
      return;
    }
    if (!confirm("Are you sure you want to delete this BOM?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.email || "Unknown";

      const { error } = await supabase
        .from("bom_master")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Log activity
      const activityLogPayload: TablesInsert<'activity_log'> = {
        table_name: "bom_master",
        action_type: "DELETE",
        record_id: id.toString(),
        user_id: user?.id || null,
        username: username,
        description: `Deleted BOM with Unix No: ${unix_no}`,
        old_data: { id, unix_no } as any,
      };
      await (supabase.from("activity_log").insert as any)([activityLogPayload]); // Cast to any

      toast.success("BOM deleted successfully.");
      fetchBoms();
    } catch (error: any) {
      toast.error("Error deleting BOM", { description: error.message });
    }
  };

  const handleImportBomsFromExcel = async (file: File) => {
    if (!profile || !profile.role || !['admin', 'controller'].includes(profile.role)) {
      toast.error("You don't have permission to import BOM");
      return;
    }
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.email || "Unknown";

      const bomsToImport: TablesInsert<'bom_master'>[] = jsonData.map((row: any) => ({
        unix_no: row["Unix No"] || row.unix_no || "",
        model: row["Model"] || row.model || "",
        cyl: row["Cyl"] || row.cyl || null,
        parent_part: row["Parent Part"] || row.parent_part || "",
        child_part: row["Child Part"] || row.child_part || "",
        part_name: row["Part Name"] || row.part_name || "",
        bom: row["BOM_Original"] ? String(row["BOM_Original"]) : null,
        qty_bom: row["BOM"] ? parseInt(row["BOM"]) : null,
        qty_per_set: parseInt(row["Qty Per Set"] || row.qty_per_set || "1"),
        safety_stock: row["Safety Stock"] ? parseInt(row["Safety Stock"]) : null,
        label_code: row["Label Code"] || row.label_code || null,
        rack: row["Rack"] || row.rack || null,
        location: row["Location"] || row.location || null,
        kanban_code: row["Kanban Code"] || row.kanban_code || null,
        sequence: parseInt(row["Sequence"] || row.sequence || "0"),
        assy_line_no: row["Assy Line No"] || row.assy_line_no || null,
        source: row["Source"] || row.source || "KYBJ",
        created_by: user?.id || null,
      }));

      const { error } = await (supabase.from("bom_master").insert as any)(bomsToImport); // Cast to any
      if (error) throw error;

      // Log activity for bulk import
      const activityLogPayload: TablesInsert<'activity_log'> = {
        table_name: "bom_master",
        action_type: "BULK_INSERT",
        user_id: user?.id || null,
        username: username,
        description: `Imported ${bomsToImport.length} BOM records from Excel`,
        new_data: bomsToImport as any,
      };
      await (supabase.from("activity_log").insert as any)([activityLogPayload]); // Cast to any

      toast.success(`Successfully imported ${bomsToImport.length} BOM records.`);
      fetchBoms();
    } catch (error: any) {
      toast.error("Error importing Excel", { description: error.message });
    }
  };

  const handleExport = () => {
    const filteredBoms = boms.filter((bom) =>
      Object.values(bom).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    const exportData = filteredBoms.map((bom) => ({
      "Unix No": bom.unix_no,
      "Model": bom.model,
      "Cyl": bom.cyl || "-",
      "Parent Part": bom.parent_part,
      "Child Part": bom.child_part,
      "Part Name": bom.part_name,
      "BOM": bom.qty_bom,
      "Qty Per Set": bom.qty_per_set,
      "Safety Stock": bom.safety_stock,
      "Label Code": bom.label_code || "-",
      "Rack": bom.rack || "-",
      "Location": bom.location || "-",
      "Kanban Code": bom.kanban_code || "-",
      "Sequence": bom.sequence,
      "Assy Line No": bom.assy_line_no || "-",
      "Source": bom.source,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BOM Master");
    XLSX.writeFile(workbook, `BOM_Master_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast.success("BOM data exported successfully");
  };

  if (authLoading || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <BomMasterHeader
        onImportClick={handleImportBomsFromExcel}
        onExportClick={handleExport}
        onAddClick={handleAddClick}
      />

      <main className="container mx-auto px-4 py-6">
        <Card>
          <BomTable
            boms={boms}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEdit={handleEditClick}
            onDelete={handleDelete}
          />
        </Card>
      </main>

      <BomFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingBom={editingBom}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};

export default BomMaster;