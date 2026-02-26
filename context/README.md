## `context/` folder

This folder documents how Ecosyz Search builds and inspects prompts for LLM calls, especially for the app‑builder.

- `STRATEGY.md` — high‑level design for:
  - Shared prompt/context builder (`src/lib/app-builder/contextBuilder.ts`).
  - Provider selection (Groq vs OpenRouter / DeepSeek).
  - Debug surfaces to see exactly what we send to the LLM.

### How to see what we send to the LLM

Use the debug API route (no LLM call is made):

- **Route**: `POST /api/app-projects/:id/chat/debug`
- **Body (example)**:

```json
{
  "message": "Add a pricing section with three tiers.",
  "userProvider": "groq",
  "userModel": "llama-3.3-70b-versatile",
  "currentFile": "src/App.jsx"
}
```

- **Response** (simplified):
  - `provider` / `model` — which backend would be used.
  - `project` — basic metadata (id, type, framework, fileCount).
  - `context.systemPrompt` — full system prompt string.
  - `context.userMessage` — full user prompt string (including questionnaire + file context).
  - `context.approxTokens` — approximate token usage.

This JSON response is the canonical, inspectable representation of **what we send to the LLM** for app‑builder requests.

