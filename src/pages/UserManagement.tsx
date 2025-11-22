import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Pencil, Search } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { Tables, TablesUpdate, TablesInsert } from "@/integrations/supabase/types"; // Import Tables types

const UserManagement = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading, isAdmin } = useUserRole();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate("/auth");
    } else if (!authLoading && !isAdmin()) {
      toast.error("You don't have permission to access this page");
      navigate("/");
    } else if (profile && isAdmin()) {
      fetchUsers();
    }
  }, [authLoading, profile, navigate]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("username", { ascending: true });

    if (error) {
      toast.error("Error loading users");
    } else {
      setUsers(data || []);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<TablesUpdate<'profiles'>>) => {
    try {
      const { error } = await (supabase
        .from("profiles")
        .update as any)(updates) // Cast to any
        .eq("id", userId);

      if (error) throw error;

      // Log activity
      const activityLogPayload: TablesInsert<'activity_log'> = {
        user_id: profile?.id || null,
        username: profile?.username || "Unknown",
        action_type: "UPDATE",
        table_name: "profiles",
        record_id: userId,
        new_data: updates as any,
        description: `Updated user: ${users.find(u => u.id === userId)?.username}`,
      };
      await (supabase.from("activity_log").insert as any)([activityLogPayload]); // Cast to any

      toast.success("User updated successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const filteredUsers = users.filter((user) =>
    Object.values(user).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "controller":
        return "bg-blue-500";
      case "operator":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">User Management</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.full_name || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User: {user.username}</DialogTitle>
                              <DialogDescription>
                                Update the role and active status for this user.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Role</Label>
                                <Select
                                  defaultValue={user.role}
                                  onValueChange={(value) => handleUpdateUser(user.id, { role: value as TablesUpdate<'profiles'>['role'] })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="controller">Controller</SelectItem>
                                    <SelectItem value="operator">Operator</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Active Status</Label>
                                <Switch
                                  checked={user.is_active}
                                  onCheckedChange={(checked) =>
                                    handleUpdateUser(user.id, { is_active: checked })
                                  }
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserManagement;