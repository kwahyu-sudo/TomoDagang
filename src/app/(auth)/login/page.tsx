"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setError("Email atau password salah.");
    else window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-20 space-y-4u">
      <div className="text-center mb-4u">
        <h1 className="text-3xl font-semibold text-ink">TomoDagang</h1>
        <p className="text-sm text-ink-faint">Teman berdagang UMKM</p>
      </div>
      <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-danger-ink text-sm">{error}</p>}
      <button className="btn-primary w-full" type="submit">Masuk</button>
    </form>
  );
}
