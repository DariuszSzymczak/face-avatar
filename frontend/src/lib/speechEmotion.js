const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");

const LEXICON = {
  joy: ["super", "swietn", "fajn", "ciesz", "radosc", "radosn", "szczesliw", "kocham", "uwielbiam", "hura", "wspanial", "genialn", "dobrze", "zajebist", "ekstra", "extra", "smieszn", "haha", "brawo", "dzieki", "dziekuj", "piekn", "udalo", "wygral", "milo", "rewelac", "cudown", "zachwyc", "lubie", "bomba", "spoko", "tak jest", "wesol"],
  sadness: ["smut", "przykro", "szkoda", "zal", "plac", "placz", "tesk", "samotn", "zle mi", "nieszczesl", "depres", "zmeczon", "boli", "bol", "strac", "umarl", "niestety", "przygnebi", "zawiod", "rozczarow", "beznadziej", "nic mi nie wychodzi", "przegral", "zegnaj", "trudno"],
  anger: ["wkurz", "wscie", "zlosc", "zlosci", "denerw", "nienawidz", "cholera", "kurwa", "kurde", "psia", "mam dosc", "dosc", "irytuj", "wnerw", "glupi", "idiot", "debil", "wkurwi", "szlag", "spierdal", "przestan", "zamknij sie", "wqrw", "zly jestem", "jestem zly", "jestem zla", "oburz", "skandal"],
  surprise: ["wow", "serio", "naprawde", "niemozliwe", "o rany", "rany", "jejku", "o boze", "nie wierze", "zaskocz", "szok", "niesamowit", "ojej", "jak to", "co takiego", "o kurcze", "ale numer", "nieprawdopod", "niespodziew"],
};

// Free, in-browser Polish emotion analysis based on keywords, negation and punctuation.
export function analyzeText(text) {
  const t = ` ${norm(text)} `;
  const scores = { joy: 0, sadness: 0, anger: 0, surprise: 0 };
  for (const [emo, words] of Object.entries(LEXICON)) {
    for (const w of words) {
      let idx = t.indexOf(w);
      while (idx !== -1) {
        const before = t.slice(Math.max(0, idx - 5), idx);
        if (emo === "joy" && /\bnie\s$/.test(before)) scores.sadness += 1;
        else scores[emo] += 1;
        idx = t.indexOf(w, idx + w.length);
      }
    }
  }
  const excl = (text.match(/!/g) || []).length;
  if (/\?/.test(text)) scores.surprise += 0.4;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (!total) return { emotion: "neutral", scores: { joy: 0, sadness: 0, anger: 0, surprise: 0, neutral: 1 } };
  const boost = 1 + Math.min(excl, 3) * 0.15;
  const out = {};
  for (const k in scores) out[k] = Math.min(1, (scores[k] / total) * boost);
  out.neutral = Math.max(0, 1 - Math.max(...Object.values(out)));
  const emotion = Object.entries(out).sort((a, b) => b[1] - a[1])[0][0];
  return { emotion, scores: out };
}
