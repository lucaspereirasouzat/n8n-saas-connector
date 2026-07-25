import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { integrations } from "../store/memory.js";
import type { Integration } from "../types/domain.js";
import { n8nRequest } from "../services/n8n.js";

const providers = new Set(["whatsapp", "gmail", "sheets", "slack"]);

export const dashboard: RequestHandler = (_req, res) => {
  const list = integrations.get(res.locals.user.id) || [];
  res.json({
    integrations: list,
    stats: {
      active: list.filter((integration) => integration.active).length,
      runs: 133,
      savedHours: 12.5,
    },
  });
};

export const createIntegration: RequestHandler = (req, res) => {
  const provider = String(req.body.provider || "");
  const name = String(req.body.name || "").trim();
  if (!providers.has(provider) || name.length < 2) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  const integration: Integration = {
    id: crypto.randomUUID(),
    provider,
    name,
    active: false,
    createdAt: new Date().toISOString(),
  };
  integrations.get(res.locals.user.id)?.push(integration);
  return res.status(201).json(integration);
};

export const updateIntegration: RequestHandler = async (req, res) => {
  const integration = (integrations.get(res.locals.user.id) || []).find(
    (candidate) => candidate.id === req.params.id,
  );
  if (!integration)
    return res.status(404).json({ error: "Integração não encontrada" });

  const active = req.body.active === true;
  try {
    if (integration.workflowId) {
      const workflowId = encodeURIComponent(integration.workflowId);
      await n8nRequest(
        `/workflows/${workflowId}/${active ? "activate" : "deactivate"}`,
        {
          method: "POST",
        },
      );
    }
    integration.active = active;
    return res.json(integration);
  } catch {
    return res
      .status(502)
      .json({ error: "Não foi possível atualizar o workflow" });
  }
};
