export type Role = "admin" | "manager" | "editor" | "viewer" | "spv" | "finance";

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface AppRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  roleId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  module: string;
  resourceId: string;
  details: string;
  ip: string;
  timestamp: string;
}

export interface Proposal {
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
  updatedAt: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  roleId: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  link: string;
  createdAt: string;
}
