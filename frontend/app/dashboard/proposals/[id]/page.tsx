"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Trash2, FileText, ArrowLeft, Check, Clock } from "lucide-react";

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

const financialStepLabels = ["Created", "Submitted", "SPV"];
const heavyStepLabels = ["Created", "Submitted", "SPV", "Manager", "Finance", "Super Admin"];

function getStepLabels(type?: string) {
  return type === "heavy" ? heavyStepLabels : financialStepLabels;
}

function StepProgress({ step, status, type }: { step: number; status: string; type?: string }) {
  const labels = getStepLabels(type);
  const isComplete = (idx: number) => idx < step || status === "approved";
  const isActive = (idx: number) => idx === step && status === "active";

  return (
    <div className="flex items-center justify-center py-6">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: 36,
                height: 36,
                background: isComplete(i) ? "#14b8a6" : "transparent",
                border: `2px solid ${isActive(i) ? "#14b8a6" : isComplete(i) ? "#14b8a6" : "#374151"}`,
                boxShadow: isActive(i) ? "0 0 0 4px rgba(20,184,166,0.2)" : "none",
              }}
            >
              {isComplete(i) ? (
                <Check size={18} className="text-white" strokeWidth={3} />
              ) : isActive(i) ? (
                <Clock size={15} className="text-teal-400" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-gray-500" />
              )}
            </div>
            <span
              className="text-xs font-medium whitespace-nowrap"
              style={{
                color: isComplete(i) ? "#14b8a6" : isActive(i) ? "#14b8a6" : "#6b7280",
              }}
            >
              {status === "rejected" && i === step ? "Rejected" : label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div
              className="h-px mx-3"
              style={{
                width: 56,
                background:
                  status === "rejected" && i >= step
                    ? "#ef4444"
                    : isComplete(i) && (isComplete(i + 1) || isActive(i + 1))
                    ? "#14b8a6"
                    : "#374151",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProposalDetailPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);

  const canApprove = currentUser?.permissions?.includes("proposal:approve");

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.push("/login"); return; }

    const fetchProposal = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/proposals/${params?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProposal(await res.json());
      setLoading(false);
    };
    fetchProposal();
  }, [currentUser, authLoading, router, params?.id]);

  const handleAction = async (action: "approve" | "reject") => {
    if (!proposal) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/proposals/${proposal.id}/${action}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const updated = await res.json();
      setProposal(updated);
    }
  };

  const handleDelete = async () => {
    if (!proposal || !confirm("Delete this proposal?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/proposals/${proposal.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    router.push("/dashboard/proposals");
  };

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-destructive">Proposal not found</p>
        <Link href="/dashboard/proposals"><Button variant="ghost" className="mt-4">&larr; Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/proposals">
        <Button variant="ghost" size="sm"><ArrowLeft size={14} className="mr-2" /> Back to Proposals</Button>
      </Link>

      <Card className="overflow-hidden">
        <div
          className="h-1.5"
          style={{
            background:
              proposal.status === "approved"
                ? "#14b8a6"
                : proposal.status === "rejected"
                ? "#ef4444"
                : "linear-gradient(90deg, #14b8a6, #14b8a6 50%, #374151 50%, #374151)",
          }}
        />
        <CardContent className="py-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-muted-foreground" />
              <h1 className="text-xl font-bold font-mono">{proposal.proposalCode}</h1>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                proposal.status === "approved"
                  ? "bg-green-500/10 text-green-400"
                  : proposal.status === "rejected"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-yellow-500/10 text-yellow-400"
              }`}
            >
              {proposal.status === "active" ? `${getStepLabels(proposal.type)[proposal.step]} — Active` : proposal.status}
            </span>
          </div>

          <StepProgress step={proposal.step} status={proposal.status} type={proposal.type} />

          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <span className="text-muted-foreground">Date</span>
              <p className="font-medium">{proposal.date}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium">{proposal.type === "heavy" ? "Heavy (Pengajuan Berat)" : "Financial (Pengajuan Keuangan)"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Division</span>
              <p className="font-medium">{proposal.division}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Currency</span>
              <p className="font-medium">{proposal.currency}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Amount</span>
              <p className="font-medium">{Number(proposal.totalAmount).toLocaleString("id-ID", { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Submitted by</span>
              <p className="font-medium">{proposal.userEmail}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created</span>
              <p className="font-medium">{new Date(proposal.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {proposal.description && (
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">Description</span>
              <p className="text-sm mt-1">{proposal.description}</p>
            </div>
          )}

          {proposal.pdfFile && (
            <div className="mt-4">
              <a
                href={`${API_URL.replace("/api", "")}/uploads/proposals/${proposal.pdfFile}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                <FileText size={14} /> View PDF
              </a>
            </div>
          )}

          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            {proposal.status === "active" && canApprove && (
              <>
                <Button size="sm" onClick={() => handleAction("approve")}>
                  <CheckCircle size={14} className="mr-1.5" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleAction("reject")}>
                  <XCircle size={14} className="mr-1.5" /> Reject
                </Button>
              </>
            )}
            {(currentUser?.permissions?.includes("proposal:delete") || proposal.userId === currentUser?.id) && proposal.status === "active" && (
              <Button size="sm" variant="ghost" onClick={handleDelete}>
                <Trash2 size={14} className="mr-1.5" /> Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
