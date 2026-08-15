import { generateWithLLM } from "@/lib/ai";

export type Intent = "transactional" | "commercial" | "informational" | "navigational";

export type KeywordCandidate = {
  keyword: string;
  intent: Intent;
  source: "claude" | "serp_autocomplete" | "serp_related" | "serp_paa";
  notes: string;
};

// Ported from keyword-search-optimizer/src/keyword_generator.py — same prompt shape
// (40 ideas, intent-classified, one-line rationale) so results stay consistent
// with the standalone tool, just scoped to a specific ad group's product.
const GENERATE_PROMPT = `You are a senior SEO / SEM keyword research expert.

Generate 40 high-value keyword ideas based on this seed: "{seed}"
Context/niche (if provided): {context}

Include a diverse mix:
- Long-tail variations (3-5 words, high conversion potential)
- Question keywords (what, how, why, when, can I)
- Comparison keywords (vs, best, alternatives, reviews)
- Transactional keywords (buy, book, apply, cost, fee, near me)
- Informational keywords (guide, tips, explained, step by step)

For each keyword, classify intent:
- transactional: user is ready to act (book, buy, apply)
- commercial: user is researching before buying/deciding
- informational: user wants to learn
- navigational: user is looking for a specific brand/site

Return ONLY a valid JSON array, no other text:
[
  {"keyword": "keyword phrase here", "intent": "informational", "notes": "one-line why this matters"},
  ...
]`;

const MODIFIERS_BY_INTENT: Record<Intent, string[]> = {
  transactional: ["booking", "how to buy", "price", "promo code", "near me", "official site"],
  commercial: ["reviews", "rating", "comparison", "reddit", "worth it"],
  informational: ["guide", "tutorial", "how to use", "tips", "faq"],
  navigational: ["official", "customer service", "booking site"],
};

function mockCandidates(seed: string): KeywordCandidate[] {
  const cleaned = seed.replace(/^[A-Za-z]+_/, "").replace(/[（(].*/g, "").trim();
  const out: KeywordCandidate[] = [];
  (Object.keys(MODIFIERS_BY_INTENT) as Intent[]).forEach((intent) => {
    for (const m of MODIFIERS_BY_INTENT[intent]) {
      out.push({
        keyword: `${cleaned} ${m}`,
        intent,
        source: "claude",
        notes: `Common search term for ${intent} intent`,
      });
    }
  });
  return out;
}

export async function generateKeywordIdeas(opts: {
  seed: string;
  context: string;
  product: string;
}): Promise<{ candidates: KeywordCandidate[]; usedRealApi: boolean }> {
  const fallback = JSON.stringify(mockCandidates(opts.seed));
  const prompt = GENERATE_PROMPT.replace("{seed}", opts.seed).replace(
    "{context}",
    opts.context || "not specified"
  );

  const result = await generateWithLLM({
    prompt,
    product: opts.product,
    feature: "keyword",
    fallback,
  });

  let raw: Array<{ keyword?: string; intent?: string; notes?: string }>;
  try {
    const match = result.text.match(/\[[\s\S]*\]/);
    raw = JSON.parse(match ? match[0] : result.text);
    if (!Array.isArray(raw)) throw new Error("not array");
  } catch {
    raw = mockCandidates(opts.seed);
  }

  const validIntents: Intent[] = ["transactional", "commercial", "informational", "navigational"];
  const candidates: KeywordCandidate[] = raw
    .filter((r) => r.keyword)
    .map((r) => ({
      keyword: String(r.keyword).trim(),
      intent: validIntents.includes(r.intent as Intent) ? (r.intent as Intent) : "informational",
      source: "claude" as const,
      notes: String(r.notes ?? ""),
    }));

  return { candidates, usedRealApi: result.usedRealApi };
}

// Ported from keyword-search-optimizer/src/serp_fetcher.py
function classifyIntentHeuristic(keyword: string): Intent {
  const kw = keyword.toLowerCase();
  if (["buy", "book", "apply", "cost", "price", "fee", "near me", "download", "sign up", "get"].some((w) => kw.includes(w)))
    return "transactional";
  if (["best", "vs", "review", "compare", "top", "alternative", "difference"].some((w) => kw.includes(w)))
    return "commercial";
  if (["what", "how", "why", "when", "who", "guide", "tips", "explained", "meaning", "definition", "example"].some((w) => kw.includes(w)))
    return "informational";
  return "informational";
}

const SERPAPI_BASE = "https://serpapi.com/search";

async function getAutocomplete(seed: string, apiKey: string): Promise<KeywordCandidate[]> {
  try {
    const url = `${SERPAPI_BASE}?engine=google_autocomplete&hl=en&gl=us&q=${encodeURIComponent(seed)}&api_key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
    const data = await res.json();
    const suggestions: Array<{ value?: string }> = data.suggestions ?? [];
    return suggestions
      .filter((s) => s.value)
      .map((s) => ({
        keyword: s.value as string,
        intent: classifyIntentHeuristic(s.value as string),
        source: "serp_autocomplete" as const,
        notes: "Google autocomplete suggestion",
      }));
  } catch {
    return [];
  }
}

async function getRelatedSearches(seed: string, apiKey: string): Promise<KeywordCandidate[]> {
  try {
    const url = `${SERPAPI_BASE}?engine=google&hl=en&gl=us&num=10&q=${encodeURIComponent(seed)}&api_key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
    const data = await res.json();
    const out: KeywordCandidate[] = [];
    const related: Array<{ query?: string }> = data.related_searches ?? [];
    for (const item of related) {
      if (item.query) {
        out.push({
          keyword: item.query,
          intent: classifyIntentHeuristic(item.query),
          source: "serp_related",
          notes: "Google related search",
        });
      }
    }
    const paa: Array<{ question?: string }> = data.related_questions ?? [];
    for (const item of paa) {
      if (item.question) {
        out.push({
          keyword: item.question,
          intent: "informational",
          source: "serp_paa",
          notes: "People Also Ask",
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchSerpKeywords(seed: string): Promise<KeywordCandidate[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];
  const [autocomplete, related] = await Promise.all([
    getAutocomplete(seed, apiKey),
    getRelatedSearches(seed, apiKey),
  ]);
  return [...autocomplete, ...related];
}

export function dedupeCandidates(lists: KeywordCandidate[][]): KeywordCandidate[] {
  const seen = new Set<string>();
  const out: KeywordCandidate[] = [];
  for (const list of lists) {
    for (const c of list) {
      const key = c.keyword.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}
