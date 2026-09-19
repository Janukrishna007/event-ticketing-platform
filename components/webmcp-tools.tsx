"use client";

import { useEffect } from "react";

type ModelContext = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: () => Promise<{ path: string }>;
  }, options: { signal: AbortSignal }) => void | Promise<void>;
};

export function WebMcpTools() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "start_event_creation",
      title: "Create an event",
      description: "Open the organizer form for creating and publishing a real event.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute() {
        window.location.assign("/organizer/events/new");
        return { path: "/organizer/events/new" };
      },
    }, { signal: lifecycle.signal })).catch((error) => console.error("Unable to register browser tool", error));
    return () => lifecycle.abort();
  }, []);
  return null;
}
