/**
 * Input sanitization helpers for XSS prevention and content filtering.
 */

// Dangerous HTML/script patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^\s>]+/gi,
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /expression\s*\(/gi,
];

/**
 * Strip XSS payloads from user input while preserving normal text.
 */
export function sanitizeInput(input: string): string {
  let cleaned = input;
  for (const pattern of XSS_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  // Strip null bytes
  cleaned = cleaned.replace(/\0/g, "");
  return cleaned.trim();
}

/**
 * Check if input contains potential XSS payloads.
 */
export function containsXSS(input: string): boolean {
  return XSS_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
}

/**
 * Detect repeated/spam content.
 * Returns true if the message appears to be spam.
 */
export function isSpamContent(content: string, previousMessages?: string[]): boolean {
  // Single character repeated
  if (/^(.)\1{9,}$/.test(content.trim())) return true;

  // Very short meaningless repeated patterns
  if (/^(.{1,3})\1{5,}$/.test(content.trim())) return true;

  // Check for exact duplicate of last 3 messages
  if (previousMessages && previousMessages.length > 0) {
    const lastThree = previousMessages.slice(-3);
    const duplicateCount = lastThree.filter((m) => m === content).length;
    if (duplicateCount >= 2) return true;
  }

  return false;
}

/**
 * Detect nonsensical/gibberish messages.
 * Returns true if the message appears to be meaningless.
 */
export function isNonsenseMessage(content: string): boolean {
  const trimmed = content.trim();

  // Too short to be meaningful (single char or empty)
  if (trimmed.length <= 1) return false; // Allow single chars as they might be intentional

  // Only whitespace/punctuation
  if (/^[\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]+$/.test(trimmed)) return true;

  // Random keyboard mashing (high ratio of consonant clusters in Latin)
  const latinOnly = trimmed.replace(/[^a-zA-Z]/g, "");
  if (latinOnly.length > 5) {
    const vowelRatio = (latinOnly.match(/[aeiouAEIOU]/g) || []).length / latinOnly.length;
    if (vowelRatio < 0.05) return true; // Almost no vowels = keyboard mashing
  }

  return false;
}
