import test from "node:test"
import assert from "node:assert/strict"
import { _internal } from "../index.mjs"

test("promptFromMessages preserves roles and text", () => {
  assert.equal(
    _internal.promptFromMessages([
      { role: "system", content: "Be brief" },
      { role: "user", content: [{ type: "text", text: "Ping" }] },
    ]),
    "<system>\nBe brief\n</system>\n\n<user>\nPing\n</user>",
  )
})

test("eventFromTrae maps agent messages and usage", () => {
  assert.deepEqual(_internal.eventFromTrae({ type: "item.completed", item: { type: "agent_message", text: "pong" } }), { text: "pong" })
  assert.deepEqual(_internal.eventFromTrae({ type: "turn.completed", usage: { input_tokens: 2, output_tokens: 1 } }), { usage: { input_tokens: 2, output_tokens: 1 } })
})

test("usageFromTrae maps token fields", () => {
  assert.deepEqual(_internal.usageFromTrae({ input_tokens: 10, output_tokens: 3, cached_input_tokens: 4, cache_creation_input_tokens: 5, reasoning_output_tokens: 2 }), {
    prompt_tokens: 10,
    completion_tokens: 3,
    total_tokens: 13,
    prompt_tokens_details: { cached_tokens: 4, cache_creation_tokens: 5 },
    completion_tokens_details: { reasoning_tokens: 2 },
  })
})

test("stripWarnings removes traecli path warning", () => {
  assert.equal(_internal.stripWarnings("WARNING: proceeding\n[{\"name\":\"m\"}]\n"), "[{\"name\":\"m\"}]")
})

test("maxModelConfig reads Max from the raw traecli model list", () => {
  const max = _internal.maxModelConfig({
    name: "GLM-5.3-FlashX",
    context_window: 200000,
    _meta: { trae: { supportsMaxMode: true, maxContextWindow: 1000000 } },
  })
  assert.equal(max.id, "GLM-5.3-FlashX-1M")
  assert.equal(max.limit.context, 1000000)
  assert.equal(_internal.maxModelConfig({ name: "MiniMax-M2.7", context_window: 200000, _meta: { trae: {} } }), null)
})

test("traeModelArgs sends Max as a variant, not a model id", () => {
  assert.deepEqual(_internal.traeModelArgs("GLM-5.3-FlashX-1M"), ["-c", 'model_backend_variant="max"', "--model", "GLM-5.3-FlashX"])
  assert.deepEqual(_internal.traeModelArgs("GLM-5.3-FlashX"), ["--model", "GLM-5.3-FlashX"])
})

test("parseJsonLines ignores non-json and maps events", async () => {
  async function* lines() {
    yield "not json"
    yield JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "ok" } })
  }
  const got = []
  for await (const ev of _internal.parseJsonLines(lines())) got.push(ev)
  assert.deepEqual(got, [{ text: "ok" }])
})
