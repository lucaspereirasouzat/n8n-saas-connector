import { env } from "../config/env.js";

export async function n8nRequest(path: string, init?: RequestInit) {
  if (!env.n8nBaseUrl || !env.n8nApiKey) return null;

  const response = await fetch(
    `${env.n8nBaseUrl.replace(/\/$/, "")}/api/v1${path}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": env.n8nApiKey,
        ...init?.headers,
      },
    },
  );

  if (!response.ok) throw new Error("Falha ao comunicar com n8n");
  return response.json();
}
