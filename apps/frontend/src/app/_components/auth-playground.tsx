"use client";

import { useMemo, useState } from "react";
import type { components } from "@/lib/api-schema";

type ApiEnvelope<T> = { status: 200; data: T };
type AuthSuccess = ApiEnvelope<components["schemas"]["AuthIssueTokensResponseDto"]>;
type MeSuccess = ApiEnvelope<components["schemas"]["AuthMeResponseDto"]>;
type PingSuccess = ApiEnvelope<components["schemas"]["AdminPingResponseDto"]>;

function useAuthPlayground() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password12");
  const [token, setToken] = useState("");
  const [result, setResult] = useState("まだ実行していません");

  const authHeader = useMemo(() => {
    if (!token.trim()) {
      return "";
    }
    return `Bearer ${token.trim()}`;
  }, [token]);

  async function callJson<T>(path: string, init: RequestInit = {}) {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const body: T | Record<string, unknown> = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  }

  async function onRegister() {
    const { ok, status, body } = await callJson<AuthSuccess>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (ok) {
      setToken((body as AuthSuccess).data.access_token);
    }
    setResult(`[register] HTTP ${status}\n${JSON.stringify(body, null, 2)}`);
  }

  async function onLogin() {
    const { ok, status, body } = await callJson<AuthSuccess>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (ok) {
      setToken((body as AuthSuccess).data.access_token);
    }
    setResult(`[login] HTTP ${status}\n${JSON.stringify(body, null, 2)}`);
  }

  async function onMe() {
    const { status, body } = await callJson<MeSuccess>("/api/auth/me", {
      method: "POST",
      headers: authHeader ? { Authorization: authHeader } : {},
      body: JSON.stringify({}),
    });
    setResult(`[me] HTTP ${status}\n${JSON.stringify(body, null, 2)}`);
  }

  async function onAdminPing() {
    const res = await fetch("/api/auth/admin-ping", {
      method: "GET",
      headers: authHeader ? { Authorization: authHeader } : {},
    });
    const body = await res.json().catch(() => ({}));
    setResult(
      `[admin/ping] HTTP ${res.status}\n${JSON.stringify(body as PingSuccess | Record<string, unknown>, null, 2)}`,
    );
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    token,
    setToken,
    result,
    onRegister,
    onLogin,
    onMe,
    onAdminPing,
  };
}

export function AuthPlayground() {
  const vm = useAuthPlayground();

  return (
    <main className="container">
      <header className="header">
        <h1>Auth Playground</h1>
        <p className="meta">バックエンド `auth` エンドポイント連携UI</p>
      </header>

      <section className="card">
        <h2>Credentials</h2>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            value={vm.email}
            onChange={(e) => vm.setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={vm.password}
            onChange={(e) => vm.setPassword(e.target.value)}
            placeholder="password12"
          />
        </div>
        <div className="actions">
          <button onClick={vm.onRegister}>POST /auth/register</button>
          <button onClick={vm.onLogin}>POST /auth/login</button>
        </div>
      </section>

      <section className="card">
        <h2>Token</h2>
        <textarea
          rows={4}
          value={vm.token}
          onChange={(e) => vm.setToken(e.target.value)}
          placeholder="ログイン/登録成功時に access_token を自動セット"
        />
        <div className="actions">
          <button onClick={vm.onMe}>POST /auth/me</button>
          <button onClick={vm.onAdminPing}>GET /auth/admin/ping</button>
        </div>
      </section>

      <section className="card">
        <h2>Response</h2>
        <pre className="result">{vm.result}</pre>
      </section>
    </main>
  );
}
