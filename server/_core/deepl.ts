import { ENV } from "./env";

// DeepL Free API endpoint (note: different from paid plan)
const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

// Map from app language codes to DeepL language codes
const LANG_MAP: Record<string, string> = {
  ja: "JA",
  en: "EN",
  zh: "ZH",
  ko: "KO",
  es: "ES",
  fr: "FR",
  de: "DE",
  it: "IT",
  pt: "PT",
  ru: "RU",
  ar: "AR",
  th: "TH",
  vi: "VI",
  id: "ID",
  ms: "MS",
};

function toDeepLLang(lang: string): string {
  return LANG_MAP[lang.toLowerCase()] ?? lang.toUpperCase();
}

export type TranslationResult =
  | { ok: true; text: string }
  | { ok: false; reason: "quota_exceeded" | "api_error" | "no_key" | "network_error" | "skipped" };

/**
 * Translate text using DeepL API.
 * Returns null if translation fails or API key is not configured.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string | null> {
  const result = await translateTextWithResult(text, targetLang, sourceLang);
  return result.ok ? result.text : null;
}

/**
 * Translate text using DeepL API, returning a structured result with error reason.
 */
export async function translateTextWithResult(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<TranslationResult> {
  if (!ENV.deeplApiKey) {
    console.warn("[DeepL] API key not configured");
    return { ok: false, reason: "no_key" };
  }
  if (!text.trim()) return { ok: false, reason: "skipped" };

  const target = toDeepLLang(targetLang);
  const body: Record<string, string | string[]> = {
    text: [text],
    target_lang: target,
  };
  if (sourceLang) {
    body.source_lang = toDeepLLang(sourceLang);
  }

  try {
    const res = await fetch(DEEPL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${ENV.deeplApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[DeepL] API error ${res.status}: ${errText}`);
      // 456 = quota exceeded (DeepL-specific)
      if (res.status === 456 || res.status === 429) {
        return { ok: false, reason: "quota_exceeded" };
      }
      return { ok: false, reason: "api_error" };
    }

    const data = (await res.json()) as {
      translations: { detected_source_language: string; text: string }[];
    };
    const translated = data.translations[0]?.text;
    if (!translated) return { ok: false, reason: "api_error" };
    return { ok: true, text: translated };
  } catch (err) {
    console.error("[DeepL] Request failed:", err);
    return { ok: false, reason: "network_error" };
  }
}

/**
 * Convert a TranslationResult to a label string for storage.
 * Returns the translated text, undefined (skipped/Japanese), or an error label.
 */
export function toTranslationLabel(result: TranslationResult): string | undefined {
  if (result.ok) return result.text;
  if (result.reason === "skipped") return undefined;
  if (result.reason === "quota_exceeded") return "[翻訳上限に達しました]";
  return "[翻訳できませんでした]";
}

/**
 * Translate a visitor message to Japanese for operators.
 * Only translates if the session language is not Japanese.
 */
export async function translateToJapanese(
  text: string,
  sessionLang: string
): Promise<string | null> {
  if (sessionLang === "ja") return null;
  return translateText(text, "ja", sessionLang);
}

export async function translateToJapaneseWithResult(
  text: string,
  sessionLang: string
): Promise<TranslationResult> {
  if (sessionLang === "ja") return { ok: false, reason: "skipped" };
  return translateTextWithResult(text, "ja", sessionLang);
}

/**
 * Translate an operator message to the visitor's language.
 * Only translates if the session language is not Japanese.
 */
export async function translateFromJapanese(
  text: string,
  sessionLang: string
): Promise<string | null> {
  if (sessionLang === "ja") return null;
  return translateText(text, sessionLang, "ja");
}

export async function translateFromJapaneseWithResult(
  text: string,
  sessionLang: string
): Promise<TranslationResult> {
  if (sessionLang === "ja") return { ok: false, reason: "skipped" };
  return translateTextWithResult(text, sessionLang, "ja");
}
