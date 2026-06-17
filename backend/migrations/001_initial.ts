import { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("permissions", {
    id: { type: "text", primaryKey: true },
    code: { type: "text", notNull: true, unique: true },
    name: { type: "text", notNull: true },
    module: { type: "text", notNull: true },
    description: { type: "text" },
  });

  pgm.createTable("roles", {
    id: { type: "text", primaryKey: true },
    name: { type: "text", notNull: true, unique: true },
    description: { type: "text" },
    permissions: { type: "text", notNull: true },
    createdat: { type: "timestamptz", notNull: true },
    updatedat: { type: "timestamptz", notNull: true },
  });

  pgm.createTable("users", {
    id: { type: "text", primaryKey: true },
    email: { type: "text", notNull: true, unique: true },
    password: { type: "text" },
    name: { type: "text", notNull: true },
    role: { type: "text", notNull: true },
    roleid: { type: "text", notNull: true },
    division: { type: "text" },
    avatar: { type: "text" },
    createdat: { type: "timestamptz", notNull: true },
    updatedat: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("users", "fk_users_role", {
    foreignKeys: {
      columns: "roleid",
      references: "roles(id)",
    },
  });

  pgm.createTable("currencies", {
    id: { type: "text", primaryKey: true },
    code: { type: "text", notNull: true, unique: true },
    name: { type: "text", notNull: true },
    symbol: { type: "text" },
    exchangerate: { type: "real", notNull: true },
    isbase: { type: "boolean", notNull: true },
    createdat: { type: "timestamptz", notNull: true },
    updatedat: { type: "timestamptz", notNull: true },
  });

  pgm.createTable("proposals", {
    id: { type: "text", primaryKey: true },
    userid: { type: "text", notNull: true },
    useremail: { type: "text", notNull: true },
    proposalcode: { type: "text", notNull: true, unique: true },
    date: { type: "text", notNull: true },
    division: { type: "text", notNull: true },
    currency: { type: "text", notNull: true },
    totalamount: { type: "real", notNull: true },
    description: { type: "text" },
    pdffile: { type: "text" },
    type: { type: "text", notNull: true },
    step: { type: "integer", notNull: true },
    status: { type: "text", notNull: true },
    createdat: { type: "timestamptz", notNull: true },
    updatedat: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("proposals", "fk_proposals_user", {
    foreignKeys: {
      columns: "userid",
      references: "users(id)",
    },
  });

  pgm.createTable("audit_logs", {
    id: { type: "text", primaryKey: true },
    userid: { type: "text", notNull: true },
    useremail: { type: "text", notNull: true },
    action: { type: "text", notNull: true },
    module: { type: "text", notNull: true },
    resourceid: { type: "text" },
    details: { type: "text" },
    ip: { type: "text" },
    timestamp: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("audit_logs", "fk_audit_logs_user", {
    foreignKeys: {
      columns: "userid",
      references: "users(id)",
    },
  });

  pgm.createTable("notifications", {
    id: { type: "text", primaryKey: true },
    userid: { type: "text", notNull: true },
    title: { type: "text", notNull: true },
    message: { type: "text", notNull: true },
    type: { type: "text", notNull: true },
    read: { type: "boolean", notNull: true },
    link: { type: "text" },
    createdat: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("notifications", "fk_notifications_user", {
    foreignKeys: {
      columns: "userid",
      references: "users(id)",
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("notifications");
  pgm.dropTable("audit_logs");
  pgm.dropTable("proposals");
  pgm.dropTable("currencies");
  pgm.dropTable("users");
  pgm.dropTable("roles");
  pgm.dropTable("permissions");
}
