// SYNTRA's capabilities are dotted ("email.send", "data.query") because those
// names are registry keys, Action Gateway URL paths and audit-log values. No
// model provider accepts them: Anthropic, Bedrock and Azure all enforce
// ^[a-zA-Z0-9_-]{1,128}$ on tool names, and OpenAI's function names match the
// same shape. So the dot is swapped out on the wire and restored on the way
// back, and nothing outside these adapters has to know.
//
// "__" rather than "_" keeps the round trip unambiguous for any capability
// that later has an underscore of its own.

const WIRE_SEPARATOR = "__"

export function toWireToolName(name: string): string {
  return name.replace(/\./g, WIRE_SEPARATOR)
}

export function fromWireToolName(name: string): string {
  return name.replace(new RegExp(WIRE_SEPARATOR, "g"), ".")
}
