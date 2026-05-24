/**
 * Translate new/updated landing page keys into all non-en locale files.
 *
 * Usage: npx tsx scripts/translate-landing.ts
 *
 * Requires ANTHROPIC_API_KEY in .env
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const MESSAGES_DIR = path.resolve(__dirname, "../messages");

// The English strings that need translating
const EN_UPDATES = {
  site: {
    name: "Best Subjects",
    tagline: "The subjects that matter most, taught well.",
  },
  landing: {
    hero: "Your child is learning a lot in school. But are they learning the subjects that actually matter?",
    stakes:
      "Economics. Civics. Logic. Decision-making. Most people don't encounter these until college — if ever. By then, they've already spent years making decisions without a framework.",
    stakesKicker: "Your kid doesn't have to.",
    guideTitle:
      "The most important subjects, in plain language, with a tutor built in.",
    guideBody:
      "Best Subjects teaches economics, civics, business, logic, and rhetoric — written for kids in plain language, with an AI tutor built into every lesson. We wrote the books ourselves, as clearly and simply as we could.",
    startFree: "Start a free lesson",
    browseSubjects: "Browse subjects",
    planTitle: "How it works",
    step1Title: "Pick a subject",
    step1: "Start with the first few lessons free. No credit card required.",
    step2Title: "Read a short lesson",
    step2: "15–20 minutes. Plain language. Real examples from a kid's world.",
    step3Title: "Ask the tutor anything",
    step3: "Your child can ask questions anytime. The AI tutor explains without giving answers away.",
    step4Title: "Answer in your own words",
    step4: "Write answers, get real feedback. Not just right or wrong — actual guidance that helps them understand.",
    successTitle: "Give your child a real foundation",
    successBody:
      "By the end, your child will have something most adults don't — a real understanding of how the world works. Prices, trade, decisions, arguments, civic life — not as abstract concepts, but as things they understand and can use.",
    parentsTitle: "You don't have to teach it yourself",
    parentsBody:
      "You don't need to be an expert. Just go through the lessons with your child, or let them work independently. The tutor handles the explaining. The grading is automatic. Your role is encouragement, not instruction.",
    languageTitle: "Available in 60+ languages",
    languageBody:
      "Every part of the experience — the lessons, the tutor, the quizzes, and the entire website — is available in your child's preferred language. They can learn in whatever language is most comfortable for them.",
    ctaTitle: "Start with a free lesson",
    ctaSub:
      "Every book has free lessons so you can see how it works before buying anything.",
  },
  auth: {
    loginSubtitle: "Sign in to Best Subjects",
    signupSubtitle: "Sign up to start learning",
  },
};

// Locale code -> language name for the prompt
const LOCALE_NAMES: Record<string, string> = {
  af: "Afrikaans",
  ar: "Arabic",
  be: "Belarusian",
  bg: "Bulgarian",
  bn: "Bengali",
  bs: "Bosnian",
  ca: "Catalan",
  cnr: "Montenegrin",
  cs: "Czech",
  cy: "Welsh",
  da: "Danish",
  de: "German",
  el: "Greek",
  es: "Spanish",
  et: "Estonian",
  eu: "Basque",
  fa: "Persian",
  fi: "Finnish",
  fo: "Faroese",
  fr: "French",
  ga: "Irish",
  gd: "Scottish Gaelic",
  gl: "Galician",
  gu: "Gujarati",
  gv: "Manx",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  hu: "Hungarian",
  is: "Icelandic",
  it: "Italian",
  ja: "Japanese",
  kn: "Kannada",
  ko: "Korean",
  la: "Latin",
  lb: "Luxembourgish",
  lt: "Lithuanian",
  lv: "Latvian",
  ml: "Malayalam",
  mr: "Marathi",
  nb: "Norwegian Bokmål",
  nl: "Dutch",
  nn: "Norwegian Nynorsk",
  nv: "Navajo",
  or: "Odia",
  pa: "Punjabi",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sl: "Slovenian",
  sr: "Serbian",
  sv: "Swedish",
  ta: "Tamil",
  te: "Telugu",
  uk: "Ukrainian",
  ur: "Urdu",
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
};

const client = new Anthropic();

async function translateForLocale(
  locale: string,
  langName: string
): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Translate the following JSON from English to ${langName} (locale: ${locale}).

Rules:
- "Best Subjects" is the brand name. Do NOT translate it — keep it as "Best Subjects" in all languages.
- Preserve all JSON keys exactly as-is (only translate the values).
- Keep the same tone: direct, warm, confident, parent-facing.
- Preserve em dashes, punctuation style, and sentence structure where natural.
- Do NOT add or remove keys.
- Return ONLY valid JSON, no commentary.

\`\`\`json
${JSON.stringify(EN_UPDATES, null, 2)}
\`\`\``,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  // Extract JSON from possible markdown fences
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1]!.trim());
}

async function main() {
  const locales = fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith(".json") && f !== "en.json")
    .map((f) => f.replace(".json", ""));

  console.log(`Translating landing page into ${locales.length} locales...`);

  // Process in batches of 10 to avoid rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < locales.length; i += BATCH_SIZE) {
    const batch = locales.slice(i, i + BATCH_SIZE);
    console.log(
      `\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(locales.length / BATCH_SIZE)}: ${batch.join(", ")}`
    );

    const results = await Promise.all(
      batch.map(async (locale) => {
        const langName = LOCALE_NAMES[locale] || locale;
        try {
          const translated = await translateForLocale(locale, langName);
          return { locale, translated, error: null };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`  ✗ ${locale} (${langName}): ${msg}`);
          return { locale, translated: null, error: msg };
        }
      })
    );

    for (const { locale, translated } of results) {
      if (!translated) continue;

      const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
      const existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      // Merge: update site, add landing, update auth subtitles
      if (translated.site && typeof translated.site === "object") {
        existing.site = { ...existing.site, ...(translated.site as Record<string, unknown>) };
      }
      if (translated.landing) {
        existing.landing = translated.landing;
      }
      if (translated.auth && typeof translated.auth === "object") {
        existing.auth = { ...existing.auth, ...(translated.auth as Record<string, unknown>) };
      }

      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + "\n");
      console.log(`  ✓ ${locale}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
