# AI Provider Abstraction — OpenRouter Now, Anthropic Later

| | |
|---|---|
| **Status** | **Implemented and verified live in production (2026-09-19).** All three agents answer from real data through OpenRouter at `/portal/ai`, each via a real tool call: Ava→`site.read`, Leo→`data.query`, Max→`workflow.read`. Getting there required one fix this plan did not anticipate — see §9. |
| **Requested by** | You want to build/test against OpenRouter now (cheaper, already have keys), and switch to native Anthropic later without a rewrite. |
| **Constraint that must survive this change** | `lib/ai/gateway.ts` is "the ONLY caller of the Anthropic SDK in this codebase," enforced by a `no-restricted-imports` ESLint rule. Budget enforcement, tool-grant policy, and approval-queuing must keep working identically regardless of which model provider is actually answering. |

---

## 1. Why this isn't a one-line change

`new Anthropic({ apiKey })` in `lib/ai/gateway.ts` talks to Anthropic's own `/v1/messages` API. OpenRouter is **not** Anthropic-API-compatible — it exposes an OpenAI-style `/v1/chat/completions` endpoint. Pointing the Anthropic SDK's `baseURL` at OpenRouter would not work; the request shape (messages, tool definitions) and the response shape (content blocks vs. `choices[].message`, `tool_use` vs. `tool_calls`) are both different. Anything that actually wants to run against OpenRouter needs to speak that shape, not Anthropic's.

The other constraint: SYNTRA's agents do real tool-calling (`MAX_TOOL_TURNS`, tool grants checked per-call via `authorizeTool`, results fed back to the model). Whatever sits underneath has to support that loop, not just single-shot text generation.

## 2. Design: one normalized interface, two adapters

```
lib/ai/
  gateway.ts          ← unchanged in structure: budget → policy → tool loop → cost → logging
  providers/
    types.ts          ← the normalized request/response shape (new)
    anthropic.ts       ← today's Anthropic SDK call, extracted verbatim (new file, same logic)
    openrouter.ts      ← new: fetch-based, translates to/from OpenAI-shaped JSON
    index.ts           ← picks a provider by env var, exposes one function (new)
```

**The normalized shape** (`types.ts`) is provider-agnostic: a list of messages, a system prompt, the tool schemas already defined in `lib/ai/tools.ts`, and `max_tokens` in; back out comes normalized text, any tool calls the model wants to make, a stop reason, and token usage. `gateway.ts`'s tool loop, budget check, and `authorizeTool` policy call **never change** — they operate on this normalized shape, not on either provider's native format. This is the entire point of the abstraction: the governance stack (budget, policy, approvals, cost accounting) is the same code path no matter which model answered.

**`providers/anthropic.ts`** — today's logic moved here unmodified: builds the Anthropic SDK call, maps its `content` blocks (`text`, `tool_use`) into the normalized shape. This is a pure extraction. Behavior for the production path does not change, and I'll verify that with a diff-level review, not just "it compiles."

**`providers/openrouter.ts`** — a `fetch()` call to `https://openrouter.ai/api/v1/chat/completions` (no new npm dependency needed — OpenRouter's API is plain JSON over HTTP). It:
- Converts our messages + system prompt into OpenAI's `messages: [{role, content}]` array.
- Converts `lib/ai/tools.ts`'s tool schemas into OpenAI's `tools: [{type: "function", function: {...}}]` shape.
- Converts the response's `choices[0].message` — including `tool_calls` — back into the same normalized shape `anthropic.ts` produces.
- Uses model id `anthropic/claude-sonnet-4.5` (or whichever current Claude model you prefer) by default via `OPENROUTER_MODEL` — **recommended specifically so you're testing against the same underlying model family you'll eventually call natively**, minimizing behavior drift between "testing on OpenRouter" and "running on Anthropic directly." You can still override it to a cheaper model for pure plumbing tests.

**`providers/index.ts`** reads one new env var, `AI_PROVIDER` (`"anthropic"` | `"openrouter"`, **defaults to `"anthropic"`** — the safe default is the real thing, not the test path), and calls the matching adapter. `gateway.ts` imports from here instead of constructing the Anthropic client directly.

## 3. What does NOT change

- The `no-restricted-imports` ESLint fence stays exactly as-is — `@anthropic-ai/sdk` is still only importable inside `lib/ai/**`. OpenRouter needs no SDK (plain `fetch`), so this rule needs no modification.
- Budget enforcement (`hard_stop`, `ai_usage_budgets`), tool-grant policy (`authorizeTool`), approval-queuing for irreversible capabilities, and `action_log` writes — all unchanged, all still enforced identically regardless of provider.
- The production path: with `AI_PROVIDER` unset or `"anthropic"`, behavior is byte-for-byte what exists today.

## 4. New environment variable, not a repurposed one

**`OPENROUTER_API_KEY`** — a new, separate variable. It will **never** be confused with `ANTHROPIC_API_KEY` again, which is exactly the mistake that caused this whole investigation (an OpenRouter key sitting in the Anthropic slot). `ANTHROPIC_API_KEY` keeps meaning exactly one thing: a real key from console.anthropic.com.

```bash
AI_PROVIDER=openrouter          # or "anthropic" (default) — omit locally to test against Anthropic instead
OPENROUTER_API_KEY=sk-or-v1-... # your existing OpenRouter key — finally in the right slot
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5   # optional override, sane default provided
```

## 5. Honest tradeoffs, stated up front

- **Not guaranteed byte-identical to native Anthropic.** OpenRouter proxies the request through its own translation layer even when the underlying model is Claude. Treat OpenRouter testing as "does the flow work correctly" — tool calls fire, budget enforcement triggers, approvals queue — not "identical token-for-token output" to what production will eventually produce.
- **Separate billing.** OpenRouter costs are OpenRouter's pricing (their own margin on top), not Anthropic's. I'll add a small OpenRouter pricing table to `lib/ai/models.ts` so `ai_requests`/`org_cost_ledger` cost tracking stays meaningful during this phase, but the numbers will shift once you flip to native Anthropic — expected, not a bug.
- **`OPENROUTER_API_KEY` gets the same handling as every other secret in this project** — env var only, rotate immediately if it's ever pasted into a chat transcript or committed.

## 6. The actual transition later

Once you have a real Anthropic key: set `ANTHROPIC_API_KEY` to it, and either remove `AI_PROVIDER` entirely or set it to `"anthropic"`. No code change, no redeploy of logic — this is the entire reason for building it this way now instead of hacking a `baseURL` override into the existing Anthropic SDK call (which, per §1, wouldn't actually work).

## 7. Verification plan

1. `tsc --noEmit`, `next lint`, `next build` — as with every change this session.
2. Confirm the Anthropic path is unchanged: run one real `/api/ai/chat` call (or the portal's `/portal/ai` chat) with `AI_PROVIDER` unset, same as today, and confirm behavior/response is identical to before this refactor.
3. Set `AI_PROVIDER=openrouter` + `OPENROUTER_API_KEY`, run the same chat flow, confirm: a normal text reply works, a tool-call flow works (e.g. Max reading automation status), an irreversible-capability request still queues an approval rather than executing directly, and `ai_requests`/`action_log` rows are written correctly either way.
4. Deliberately exceed the budget with `hard_stop` on under the OpenRouter path — confirm it refuses the same way it does under Anthropic.

## 8. Effort

Four new/changed files in `lib/ai/`, no new npm dependency, no database migration, no change to any API route's external contract. Small-to-medium — the bulk of the work is the OpenAI-shaped request/response translation in `providers/openrouter.ts`, since that's the one piece with no existing code to extract from.

---

## 9. What this plan got wrong: tool names

The design assumed the only hard part was translating *message* shape between Anthropic's
`/v1/messages` and OpenAI's `/v1/chat/completions`. It was not. **Tool names are also
constrained, identically, by both** — `^[a-zA-Z0-9_-]{1,128}$`. SYNTRA's capabilities are
dotted (`email.send`, `data.query`) because those strings double as registry keys, Action
Gateway URL paths and audit-log values, so every agent request was rejected outright:

```
OpenRouter 400: {"error":{"message":"Provider returned error","code":400,
  "metadata":{"raw":"tools.0.custom.name: String should match pattern '^[a-zA-Z0-9_-]{1,128}$'",
  "provider_name":"Azure"}}}
```

The upstream errors came from Anthropic, Bedrock **and** Azure — so this was never an
OpenRouter quirk. The native Anthropic path had the same defect and would have failed the
same way the moment a real `ANTHROPIC_API_KEY` was used; the pre-existing `401`s had simply
been failing earlier in the request, before schema validation ever ran.

`lib/ai/providers/tool-names.ts` swaps `.` → `__` on the wire and restores it on the way
back, in both adapters, at all three points a name crosses the boundary (the tool list, tool
calls echoed back in assistant turns, tool calls received in responses). `gateway.ts` and the
capability registry never see anything but the dotted names.

**The transferable lesson:** the abstraction boundary was drawn around message *shape* and
missed *identifier constraints*, which are a second, independent thing every provider
enforces. Anything else SYNTRA names on its own terms and hands to a provider — future tool
names, model aliases, stop sequences — should be checked against that provider's pattern
rules before it is assumed to pass through untouched.

---

## What's left

1. ~~Add `AI_PROVIDER` / `OPENROUTER_API_KEY` to `.env.local` and Vercel.~~ **Done.**
2. ~~Run a real chat through `/portal/ai`, including a tool-using request.~~ **Done, and it found the §9 defect.** All three agents verified live via real tool calls.
3. **Still open: the budget `hard_stop` refusal.** Turn it on, exceed the budget, confirm the request is refused rather than sent. This is the one governance guarantee never exercised against a live provider — cost control is only real if it has actually stopped something.
4. **Still open: the approval queue.** Ask an agent for something irreversible (`email.send`, `notify.slack`) and confirm it queues for approval rather than executing. The three verified tool calls were all read-only, so the write path is still untested end to end.

When switching to native Anthropic later: set `ANTHROPIC_API_KEY`, remove `AI_PROVIDER` (or set it to `anthropic`). The §9 fix applies to both adapters, so the tool names will not need revisiting.
