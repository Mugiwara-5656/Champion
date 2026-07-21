export function sanitizeHistory(history) {
  const cleaned = [];
  for (const m of history || []) {
    if (!m || !m.content || typeof m.content !== "string") continue;
    const txt = m.content.trim();
    if (!txt) continue;
    const role = m.role === "assistant" ? "assistant" : "user";
    if (cleaned.length === 0 && role !== "user") continue;
    if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === role) {
      cleaned[cleaned.length - 1].content += "\n\n" + txt;
    } else {
      cleaned.push({ role, content: txt });
    }
  }
  if (cleaned.length === 0) cleaned.push({ role: "user", content: "Hello" });
  if (cleaned[cleaned.length - 1].role !== "user") cleaned.pop();
  return cleaned;
}
