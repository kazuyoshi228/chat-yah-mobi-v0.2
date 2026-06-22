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

/**
 * Translate text using DeepL API.
 * Returns null if translation fails or API key is not configured.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string | null> {
  if (!ENV.deeplApiKey) {
    console.warn("[DeepL] API key not configured");
    return null;
  }
  if (!text.trim()) return null;

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
      return null;
    }

    const data = (await res.json()) as {
      translations: { detected_source_language: string; text: string }[];
    };
    return data.translations[0]?.text ?? null;
  } catch (err) {
    console.error("[DeepL] Request failed:", err);
    return null;
  }
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
