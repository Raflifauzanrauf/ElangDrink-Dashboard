export function toWib(date: Date): { date: string; time: string } {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const M = wib.getUTCMonth() + 1;
  const D = wib.getUTCDate();
  const Y = wib.getUTCFullYear();
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const min = String(wib.getUTCMinutes()).padStart(2, "0");
  const ss = String(wib.getUTCSeconds()).padStart(2, "0");
  return { date: `${M}/${D}/${Y}`, time: `${hh}:${min}:${ss}` };
}

export function describeAction(action: string, module: string, details: string = ""): string {
  const map: Record<string, Record<string, string>> = {
    login: { auth: "Login ke sistem" },
    register: { auth: "Registrasi akun baru" },
    logout: { auth: "Logout dari sistem" },
    create: {
      user: "Membuat user baru",
      role: "Membuat role baru",
      currency: "Menambahkan mata uang baru",
      proposal: "Membuat proposal baru",
    },
    update: {
      user: "Memperbarui data user",
      role: "Mengubah permission role",
      currency: "Memperbarui mata uang",
      proposal: "Memproses proposal",
    },
    delete: {
      user: "Menghapus user",
      role: "Menghapus role",
      currency: "Menghapus mata uang",
      proposal: "Menghapus proposal",
    },
    import: {
      currency: "Import mata uang dari CSV",
    },
  };

  if (details.includes("SSO")) return "Login via Google";
  if (map[action]?.[module]) return map[action][module];

  const actionLabels: Record<string, string> = {
    login: "Login", register: "Registrasi", logout: "Logout",
    create: "Membuat", update: "Memperbarui", delete: "Menghapus", import: "Import",
  };
  return `${actionLabels[action] || action} ${module}`;
}
