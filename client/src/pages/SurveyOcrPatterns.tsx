import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle, XCircle, Edit2, ArrowLeft, Brain, Search } from "lucide-react";
import { Link } from "wouter";

const CATEGORIES = [
  { value: "table_header", label: "Table Header", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "point_label", label: "Point Label", color: "bg-green-500/20 text-green-300 border-green-500/30" },
  { value: "coord_label", label: "Coord Label", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  { value: "elev_label", label: "Elev Label", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { value: "coord_system", label: "Coord System", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { value: "document_type", label: "Document Type", color: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
];

function getCategoryStyle(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.color ?? "bg-muted text-muted-foreground";
}

export default function SurveyOcrPatterns() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterApproved, setFilterApproved] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editPattern, setEditPattern] = useState<any>(null);

  // New pattern form
  const [newPattern, setNewPattern] = useState("");
  const [newCategory, setNewCategory] = useState("table_header");
  const [newAliases, setNewAliases] = useState("");
  const [newConfidence, setNewConfidence] = useState(80);

  const utils = trpc.useUtils();

  const { data: patterns = [], isLoading } = trpc.surveyOcr.listPatterns.useQuery({
    category: filterCategory !== "all" ? filterCategory : undefined,
    approved: filterApproved === "approved" ? 1 : filterApproved === "pending" ? 0 : undefined,
  });

  const approveMutation = trpc.surveyOcr.approvePattern.useMutation({
    onSuccess: () => { utils.surveyOcr.listPatterns.invalidate(); toast.success("Pattern updated"); },
    onError: () => toast.error("Failed to update pattern"),
  });

  const deleteMutation = trpc.surveyOcr.deletePattern.useMutation({
    onSuccess: () => { utils.surveyOcr.listPatterns.invalidate(); toast.success("Pattern deleted"); },
    onError: () => toast.error("Failed to delete pattern"),
  });

  const addMutation = trpc.surveyOcr.addPattern.useMutation({
    onSuccess: () => {
      utils.surveyOcr.listPatterns.invalidate();
      toast.success("Pattern added");
      setAddOpen(false);
      setNewPattern(""); setNewAliases(""); setNewCategory("table_header"); setNewConfidence(80);
    },
    onError: () => toast.error("Failed to add pattern"),
  });

  const updateMutation = trpc.surveyOcr.updatePattern.useMutation({
    onSuccess: () => {
      utils.surveyOcr.listPatterns.invalidate();
      toast.success("Pattern updated");
      setEditPattern(null);
    },
    onError: () => toast.error("Failed to update pattern"),
  });

  const filtered = patterns.filter(p => {
    if (search && !p.pattern.toLowerCase().includes(search.toLowerCase()) &&
        !(p.aliases ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = patterns.filter(p => p.approved === 0).length;
  const approvedCount = patterns.filter(p => p.approved === 1).length;

  if (user?.role !== "webmaster" && user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Access restricted to admin users.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Admin
            </Button>
          </Link>
        </div>

        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Brain className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Survey OCR Pattern Dataset</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Keywords the AI uses to locate and extract survey control points from any document
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" />
            Add Pattern
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{patterns.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Patterns</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-emerald-400">{approvedCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Active</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Pending Review</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-blue-400">
                {patterns.reduce((s, p) => s + (p.hitCount ?? 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Total Hits</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search patterns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterApproved} onValueChange={setFilterApproved}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pattern</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
                <TableHead className="text-center">Hits</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading patterns...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No patterns found
                  </TableCell>
                </TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id} className={p.approved === 0 ? "opacity-60" : ""}>
                  <TableCell className="font-mono font-medium">{p.pattern}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryStyle(p.category)}`}>
                      {CATEGORIES.find(c => c.value === p.category)?.label ?? p.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {p.aliases ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">{p.confidence ?? 80}%</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-sm font-medium ${(p.hitCount ?? 0) > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {p.hitCount ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.approved === 1 ? (
                      <span className="flex items-center justify-center gap-1 text-emerald-400 text-xs">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 text-yellow-400 text-xs">
                        <XCircle className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditPattern({ ...p })}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      {p.approved === 0 ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                          onClick={() => approveMutation.mutate({ id: p.id, approved: 1 })}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-yellow-400 hover:text-yellow-300"
                          onClick={() => approveMutation.mutate({ id: p.id, approved: 0 })}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive/80"
                        onClick={() => {
                          if (confirm(`Delete pattern "${p.pattern}"?`)) {
                            deleteMutation.mutate({ id: p.id });
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add Pattern Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add OCR Pattern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Pattern (keyword)</label>
              <Input
                placeholder="e.g. CONTROL POINTS"
                value={newPattern}
                onChange={e => setNewPattern(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Aliases (comma-separated)</label>
              <Input
                placeholder='e.g. "Control Pts", "CTRL PTS"'
                value={newAliases}
                onChange={e => setNewAliases(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Confidence ({newConfidence}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={newConfidence}
                onChange={e => setNewConfidence(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate({ pattern: newPattern, category: newCategory, aliases: newAliases || undefined, confidence: newConfidence })}
              disabled={!newPattern.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? "Adding..." : "Add Pattern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pattern Dialog */}
      {editPattern && (
        <Dialog open={!!editPattern} onOpenChange={() => setEditPattern(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Pattern</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Pattern</label>
                <Input
                  value={editPattern.pattern}
                  onChange={e => setEditPattern({ ...editPattern, pattern: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <Select value={editPattern.category} onValueChange={v => setEditPattern({ ...editPattern, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Aliases</label>
                <Input
                  value={editPattern.aliases ?? ""}
                  onChange={e => setEditPattern({ ...editPattern, aliases: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confidence ({editPattern.confidence ?? 80}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editPattern.confidence ?? 80}
                  onChange={e => setEditPattern({ ...editPattern, confidence: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPattern(null)}>Cancel</Button>
              <Button
                onClick={() => updateMutation.mutate({
                  id: editPattern.id,
                  pattern: editPattern.pattern,
                  category: editPattern.category,
                  aliases: editPattern.aliases,
                  confidence: editPattern.confidence,
                })}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
