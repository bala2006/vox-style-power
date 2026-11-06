#!/usr/bin/env node
/**
 * Vox video MCP server.
 *
 *   Script tools  → project files (scene JSON, assets)
 *   Voice tools   → ElevenLabs module (narration + word timestamps)
 *   Render tools  → Remotion module (Vox templates → preview stills, MP4)
 *
 * Transport is stdio, so stdout belongs to the protocol. Every console method
 * is redirected to stderr before anything else loads.
 */
for (const m of ["log", "info", "debug", "warn"] as const) {
  console[m] = (...args: unknown[]) => console.error(...args);
}

const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
const { registerTools } = await import("./tools.js");

const server = new McpServer(
  { name: "vox-video", version: "0.1.0" },
  {
    capabilities: { logging: {} },
    instructions:
      "Vox video MCP: builds narrated Vox-style motion-graphics explainers from coded Remotion templates and ElevenLabs narration. " +
      "Start with vox_get_guide (or the vox_explainer prompt) and follow it: research, script, storyboard, vox_save_project, " +
      "vox_render_preview, ONE approval gate with vox_plan_timing, then vox_synthesize_narration and vox_render_video. " +
      "Never spend ElevenLabs credits before the user approves.",
  },
);

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[vox-mcp] ready on stdio`);
