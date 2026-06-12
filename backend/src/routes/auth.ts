import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { User, Role } from "../types";
import { generateToken, users, roles, authenticate } from "../middleware/auth";
import { createAuditLog } from "../middleware/audit";

const router = Router();

if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn("GOOGLE_CLIENT_ID not set — Google sign-in will fail");
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const formatUserResponse = (user: User) => {
  const role = roles.find((r) => r.id === user.roleId);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleId: user.roleId,
    permissions: role ? role.permissions : [],
    createdAt: user.createdAt,
  };
};

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const viewerRole = roles.find((r) => r.name === "viewer");
  const user: User = {
    id: String(Date.now()),
    email,
    password: hashedPassword,
    name,
    role: "viewer",
    roleId: viewerRole?.id || "r4",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.push(user);
  const token = generateToken({ userId: user.id, email: user.email, role: user.role, roleId: user.roleId });
  createAuditLog(user.id, user.email, "register", "auth", user.id, "Registrasi akun baru");
  return res.status(201).json({ token, user: formatUserResponse(user) });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = generateToken({ userId: user.id, email: user.email, role: user.role, roleId: user.roleId });
  console.log(`[Login] ${user.email} → Token: ${token}`);
  createAuditLog(user.id, user.email, "login", "auth", user.id, "Login ke sistem");
  return res.json({ token, user: formatUserResponse(user) });
});

router.post("/logout", authenticate, (req: Request, res: Response) => {
  if (req.user) {
    createAuditLog(req.user.userId, req.user.email, "logout", "auth", req.user.userId, "Logout dari sistem");
  }
  return res.json({ message: "Logged out" });
});

router.post("/google", async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: "Google credential is required" });
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Invalid Google token" });
    }
    let user = users.find((u) => u.email === payload.email);
    if (!user) {
      const viewerRole = roles.find((r) => r.name === "viewer");
      user = {
        id: String(Date.now()),
        email: payload.email,
        password: "",
        name: payload.name || payload.email.split("@")[0],
        role: "viewer",
        roleId: viewerRole?.id || "r4",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.push(user);
    }
    const token = generateToken({ userId: user.id, email: user.email, role: user.role, roleId: user.roleId });
    console.log(`[SSO Login] ${user.email} → Token: ${token}`);
    createAuditLog(user.id, user.email, "login", "auth", user.id, "Login via Google");
    return res.json({ token, user: formatUserResponse(user) });
  } catch (err) {
    return res.status(401).json({ message: "Google authentication failed" });
  }
});

router.get("/me", authenticate, (req: Request, res: Response) => {
  const user = users.find((u) => u.id === req.user!.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(formatUserResponse(user));
});

export default router;
