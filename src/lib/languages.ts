export const LANGUAGES = [
  { code: "es", name: "Spanish", emoji: "🇪🇸" },
  { code: "fr", name: "French", emoji: "🇫🇷" },
  { code: "de", name: "German", emoji: "🇩🇪" },
  { code: "it", name: "Italian", emoji: "🇮🇹" },
  { code: "pt", name: "Portuguese", emoji: "🇵🇹" },
  { code: "ja", name: "Japanese", emoji: "🇯🇵" },
  { code: "ko", name: "Korean", emoji: "🇰🇷" },
  { code: "zh", name: "Mandarin", emoji: "🇨🇳" },
  { code: "ar", name: "Arabic", emoji: "🇸🇦" },
  { code: "hi", name: "Hindi", emoji: "🇮🇳" },
  { code: "ru", name: "Russian", emoji: "🇷🇺" },
  { code: "en", name: "English", emoji: "🇬🇧" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
