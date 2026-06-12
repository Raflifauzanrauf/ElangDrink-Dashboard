"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Star, Search, ChevronLeft, ChevronRight, Download, Upload, Globe } from "lucide-react";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  createdAt: string;
  updatedAt: string;
}

const API_URL = "http://localhost:4000/api";

export default function CurrenciesPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", symbol: "", exchangeRate: "1", isBase: false });
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [isBaseFilter, setIsBaseFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; errors: { row: number; message: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencyList, setCurrencyList] = useState<Record<string, string>>({});
  const [currencySearch, setCurrencySearch] = useState("");
  const [loadingCurrencyList, setLoadingCurrencyList] = useState(false);

  const canCreate = currentUser?.permissions?.includes("currency:create");
  const canUpdate = currentUser?.permissions?.includes("currency:update");
  const canDelete = currentUser?.permissions?.includes("currency:delete");
  const limit = 12;

  const fetchCurrencies = async () => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (isBaseFilter && isBaseFilter !== "all") params.set("isBase", isBaseFilter);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const res = await fetch(`${API_URL}/currencies?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setCurrencies(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    }
  };

  const openCurrencyPicker = async () => {
    setShowCurrencyPicker(true);
    setLoadingCurrencyList(true);
    try {
      const res = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json");
      if (res.ok) setCurrencyList(await res.json());
    } catch {} finally {
      setLoadingCurrencyList(false);
    }
  };

  const pickCurrency = async (code: string) => {
    const name = currencyList[code] || code.toUpperCase();
    setForm((prev) => ({ ...prev, code: code.toUpperCase(), name, symbol: "" }));
    setShowCurrencyPicker(false);
    setCurrencySearch("");
    try {
      const res = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/idr.json");
      if (res.ok) {
        const data = await res.json();
        const rateInIdr = data.idr?.[code];
        if (rateInIdr && rateInIdr > 0) {
          setForm((prev) => ({ ...prev, exchangeRate: String(Number((1 / rateInIdr).toPrecision(6))) }));
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.push("/login"); return; }
    fetchCurrencies().finally(() => setLoading(false));
  }, [currentUser, authLoading, router, page, search, isBaseFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const token = localStorage.getItem("token");
    const method = editId ? "PUT" : "POST";
    const url = editId ? `${API_URL}/currencies/${editId}` : `${API_URL}/currencies`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, exchangeRate: parseFloat(form.exchangeRate) || 1 }),
    });
    if (!res.ok) {
      const err = await res.json();
      setFormError(err.message);
      return;
    }
    setForm({ code: "", name: "", symbol: "", exchangeRate: "1", isBase: false });
    setEditId(null);
    setShowForm(false);
    setPage(1);
    fetchCurrencies();
  };

  const handleEdit = (c: Currency) => {
    setForm({ code: c.code, name: c.name, symbol: c.symbol, exchangeRate: String(c.exchangeRate), isBase: c.isBase });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this currency?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/currencies/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchCurrencies();
  };

  const handleExport = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/currencies/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "currencies.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/currencies/import/csv`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const result = await res.json();
      setImportResult(result);
      fetchCurrencies();
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          <h1 className="text-2xl font-bold">Currencies</h1>
          <p className="text-muted-foreground text-sm">{total} currencies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export CSV</Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={14} className="mr-1" /> Import CSV</Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          {canCreate && (
            <Button variant="secondary" onClick={() => { setEditId(null); setForm({ code: "", name: "", symbol: "", exchangeRate: "1", isBase: false }); setShowForm(!showForm); }}>
              <Plus size={16} className="mr-2" /> New Currency
            </Button>
          )}
        </div>
      </div>

      {importResult && (
        <Card className="border-green-500/50">
          <CardContent className="py-3 flex items-center justify-between">
            <p className="text-sm">Imported: <span className="font-medium text-green-400">{importResult.imported}</span>, Updated: <span className="font-medium text-yellow-400">{importResult.updated}</span>, Errors: <span className="font-medium text-red-400">{importResult.errors.length}</span></p>
            <Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>Dismiss</Button>
          </CardContent>
          {importResult.errors.length > 0 && (
            <CardContent className="pb-3 pt-0">
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-400">Row {err.row}: {err.message}</p>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by code or name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
        </div>
        <Select value={isBaseFilter} onValueChange={(v) => { setIsBaseFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All currencies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All currencies</SelectItem>
            <SelectItem value="true">Base only</SelectItem>
            <SelectItem value="false">Non-base only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{editId ? "Edit Currency" : "Add Currency"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ccode">Code</Label>
                <div className="flex gap-2">
                  <Input id="ccode" placeholder="USD" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required className="flex-1" />
                  {!editId && (
                    <Button type="button" variant="outline" size="sm" onClick={openCurrencyPicker} title="Pick currency">
                      <Globe size={14} />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cname">Name</Label>
                <Input id="cname" placeholder="US Dollar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="csymbol">Symbol</Label>
                <Input id="csymbol" placeholder="$" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="crate">Exchange Rate</Label>
                <Input id="crate" type="number" step="0.01" value={form.exchangeRate} onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2 justify-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isBase} onChange={(e) => setForm({ ...form, isBase: e.target.checked })} />
                  Base currency
                </label>
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <div className="flex gap-3 sm:col-span-3">
                <Button type="submit">{editId ? "Update" : "Create"}</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showCurrencyPicker && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pick a Currency</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowCurrencyPicker(false)}>Close</Button>
          </CardHeader>
          <CardContent>
            <Input placeholder="Search by code or name..." value={currencySearch} onChange={(e) => setCurrencySearch(e.target.value)} className="mb-4" />
            {loadingCurrencyList ? (
              <p className="text-sm text-muted-foreground">Loading currencies...</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {Object.entries(currencyList)
                  .filter(([code, name]) =>
                    code.includes(currencySearch.toLowerCase()) ||
                    name.toLowerCase().includes(currencySearch.toLowerCase())
                  )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .slice(0, 200)
                  .map(([code, name]) => (
                    <button key={code} type="button" onClick={() => pickCurrency(code)}
                      className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors"
                    >
                      <span className="font-medium uppercase">{code}</span> — {name}
                    </button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currencies.map((c) => (
          <Card key={c.id} className="transition-all duration-200 hover:border-foreground/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{c.symbol || c.code}</span>
                  <span className="text-sm font-medium">{c.code}</span>
                  {c.isBase && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                </div>
                {(canUpdate || canDelete) && (
                  <div className="flex items-center gap-1">
                    {canUpdate && <button onClick={() => handleEdit(c)} className="text-muted-foreground hover:text-foreground p-1"><Pencil size={14} /></button>}
                    {canDelete && <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-1">1 {c.code} = {Number(c.exchangeRate).toLocaleString("id-ID", { maximumSignificantDigits: 6 })} IDR</p>
            </CardContent>
          </Card>
        ))}
        {currencies.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No currencies yet.</p>}
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
