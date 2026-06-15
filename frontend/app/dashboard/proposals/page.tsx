"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Plus, FileText, Loader2 } from "lucide-react";
import Link from "next/link";

interface Proposal {
  id: string;
  userId: string;
  userEmail: string;
  proposalCode: string;
  date: string;
  division: string;
  currency: string;
  totalAmount: number;
  description: string;
  pdfFile: string;
  type: "financial" | "heavy";
  step: number;
  status: "active" | "approved" | "rejected";
  createdAt: string;
}

const API_URL = "http://localhost:4000/api";

const statusBadge: Record<string, string> = {
  active: "text-yellow-400 bg-yellow-500/10",
  approved: "text-green-400 bg-green-500/10",
  rejected: "text-red-400 bg-red-500/10",
};

const stepLabels = ["Created", "Submitted", "SPV", "Manager", "Finance"];
const heavyStepLabels = ["Created", "Submitted", "SPV", "Manager", "Finance", "Super Admin"];

function getStepLabels(type?: string) {
  return type === "heavy" ? heavyStepLabels : stepLabels;
}

const divisions = ["Finance", "Marketing", "Operations", "IT", "HR", "Sales", "Production", "R&D"];

export default function ProposalsPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ division: "", currency: "", totalAmount: "", description: "", type: "financial" });
  const [formError, setFormError] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [stepFilter, setStepFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [currencyList, setCurrencyList] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canApprove = currentUser?.permissions?.includes("proposal:approve");
  const canCreate = currentUser?.permissions?.includes("proposal:create");
  const limit = 10;

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCurrencyList(d); })
      .catch(() => {});
  }, []);

  const fetchProposals = async () => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stepFilter) params.set("step", stepFilter);
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const res = await fetch(`${API_URL}/proposals?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setProposals(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.push("/login"); return; }
    fetchProposals().finally(() => setLoading(false));
  }, [currentUser, authLoading, router, page, search, stepFilter, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("division", form.division);
    formData.append("currency", form.currency);
    formData.append("totalAmount", form.totalAmount);
    formData.append("description", form.description);
    formData.append("type", form.type);
    if (pdfFile) formData.append("pdfFile", pdfFile);
    const res = await fetch(`${API_URL}/proposals`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json();
      setFormError(err.message);
      return;
    }
    const proposal = await res.json();
    setForm({ division: "", currency: "", totalAmount: "", description: "", type: "financial" });
    setPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(false);
    router.push(`/dashboard/proposals/${proposal.id}`);
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/proposals/${id}/${action}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchProposals();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this proposal?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/proposals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchProposals();
  };

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="text-muted-foreground text-sm">{total} proposals</p>
        </div>
        {canCreate && (
          <Button variant="secondary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} className="mr-2" /> New Proposal
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by code, division..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setStepFilter(""); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">New Proposal</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pdivision">Division</Label>
                  <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select division" /></SelectTrigger>
                    <SelectContent>
                      {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pcurrency">Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select currency" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(currencyList).sort(([a], [b]) => a.localeCompare(b)).map(([code, name]) => (
                        <SelectItem key={code} value={code.toUpperCase()}>{code.toUpperCase()} — {name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ptype">Proposal Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial (SPV only)</SelectItem>
                      <SelectItem value="heavy">Heavy (up to Super Admin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pamount">Total Amount</Label>
                  <Input id="pamount" type="number" step="0.01" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ppdf">PDF File</Label>
                  <Input id="ppdf" ref={fileInputRef} type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pdesc">Description</Label>
                <textarea id="pdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Loader2 size={14} className="mr-2 animate-spin" /> Submitting...</> : "Submit Proposal"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {proposals.map((p) => (
          <Link key={p.id} href={`/dashboard/proposals/${p.id}`} className="block transition-all duration-200 hover:scale-[1.005]">
          <Card className="transition-all duration-200 hover:border-foreground/30">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} className="text-muted-foreground shrink-0" />
                    <h3 className="text-sm font-medium font-mono">{p.proposalCode}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.type === "heavy" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                      {p.type === "heavy" ? "Heavy" : "Financial"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge[p.status] || statusBadge.active}`}>
                      {p.status === "active" ? `${getStepLabels(p.type)[p.step] || ""} — Active` : p.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{p.division}</span>
                    <span>{p.currency} {Number(p.totalAmount).toLocaleString("id-ID", { maximumFractionDigits: 2 })}</span>
                    <span>{p.date}</span>
                    <span>by {p.userEmail}</span>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          </Link>
        ))}
        {proposals.length === 0 && <p className="text-center text-muted-foreground py-12">No proposals yet.</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft size={18} /></button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      )}
    </div>
  );
}
