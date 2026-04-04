"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type U = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<U[]>([]);

  const load = useCallback(() => {
    apiFetch("/admin/users/", {}, true).then((r) => r.json().then(setUsers));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (id: number, role: string) => {
    await apiFetch(
      `/admin/users/${id}/role/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      },
      true
    );
    load();
  };

  const addUser = async () => {
    const username = prompt("Kullanıcı adı?");
    const password = prompt("Şifre (min 8)?");
    const email = prompt("E-posta?", "") || "";
    if (!username || !password) return;
    await apiFetch(
      "/admin/users/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email,
          role: "viewer",
        }),
      },
      true
    );
    load();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Kullanıcılar</h1>
        <button
          type="button"
          onClick={addUser}
          className="min-h-[48px] px-4 rounded-xl bg-sky-600 text-white font-medium"
        >
          Yeni kullanıcı
        </button>
      </div>
      <ul className="space-y-3">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div>
              <p className="font-semibold text-lg">{u.username}</p>
              <p className="text-sm text-slate-500">{u.email}</p>
              <span className="inline-block mt-1 text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                {u.role}
              </span>
            </div>
            <select
              className="min-h-[48px] text-base border rounded-xl px-2 dark:bg-slate-950"
              value={u.role}
              onChange={(e) => changeRole(u.id, e.target.value)}
            >
              <option value="viewer">İzleyici</option>
              <option value="operator">Operatör</option>
              <option value="superadmin">Süper Admin</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
