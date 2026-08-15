import { prisma } from "@/lib/prisma";

type GenerateResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  usedRealApi: boolean;
};

// Calls Claude if ANTHROPIC_API_KEY is set; otherwise returns a deterministic
// mock so the UI keeps working without a key configured. Either way the
// call is logged to TokenUsageLog so the Token Usage page reflects real usage.
export async function generateWithLLM(opts: {
  prompt: string;
  product: string;
  feature: "keyword" | "sitelink";
  groupCount?: number;
  fallback: string;
}): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let result: GenerateResult;

  if (apiKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 3000,
          // These prompts ask for structured JSON, not reasoning — thinking
          // is on by default on this model and was silently eating the
          // whole max_tokens budget before any visible text got written.
          thinking: { type: "disabled" },
          messages: [{ role: "user", content: opts.prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
      const data = await res.json();
      const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
      const text = textBlock?.text ?? opts.fallback;
      result = {
        text,
        promptTokens: data.usage?.input_tokens ?? estimateTokens(opts.prompt),
        completionTokens: data.usage?.output_tokens ?? estimateTokens(text),
        usedRealApi: true,
      };
    } catch {
      result = mockResult(opts.prompt, opts.fallback);
    }
  } else {
    result = mockResult(opts.prompt, opts.fallback);
  }

  await prisma.tokenUsageLog.create({
    data: {
      product: opts.product,
      groupCount: opts.groupCount ?? 1,
      feature: opts.feature,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.promptTokens + result.completionTokens,
    },
  });

  return result;
}

function estimateTokens(s: string): number {
  return Math.max(1, Math.round(s.length / 2.2));
}

function mockResult(prompt: string, fallback: string): GenerateResult {
  return {
    text: fallback,
    promptTokens: estimateTokens(prompt),
    completionTokens: estimateTokens(fallback),
    usedRealApi: false,
  };
}
