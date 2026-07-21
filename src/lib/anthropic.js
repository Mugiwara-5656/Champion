import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MODEL = "claude-sonnet-4-6";

const SENSEI_SYSTEM =
  "You are Sensei, an elite AI martial arts coach inside the Champion training app. " +
  "Reply in max 3 sentences. Be specific, kinesthetic, tough. Reference muscles and joint mechanics. No filler. " +
  "If you identify a new weakness, end with (WEAK: short label) on its own line.";

export async function askSensei(history, ctx, weaknesses) {
  const wkLine = weaknesses?.length ? `\nKnown weaknesses: ${weaknesses.join("; ")}.` : "";
  const ctxLine = ctx ? `\nCurrently studying: ${ctx}.` : "";
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: SENSEI_SYSTEM + ctxLine + wkLine,
    messages: history,
  });
  const text = response.content.find((b) => b.type === "text")?.text;
  return text ?? "";
}

const DRILL_PLAN_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "integer" },
          focus: { type: "string" },
          drills: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                duration: { type: "string" },
                cue: { type: "string" },
              },
              required: ["name", "duration", "cue"],
              additionalProperties: false,
            },
          },
        },
        required: ["day", "focus", "drills"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "days"],
  additionalProperties: false,
};

export async function genDrillPlan(weaknesses, discipline) {
  const wk = weaknesses.length ? weaknesses.join(", ") : "general technique";
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    output_config: {
      format: { type: "json_schema", schema: DRILL_PLAN_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content:
          `Generate a personalized 7-day drill plan for an athlete training: ${discipline}. ` +
          `Weaknesses: ${wk}. ` +
          `7 days, 2-3 drills per day. Drill cues should reference specific muscles or joint mechanics.`,
      },
    ],
  });
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text);
}
