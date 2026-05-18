const jumpAiPhrases = [
  "결론적으로",
  "요약하자면",
  "중요합니다",
  "다양한",
  "효율적",
  "최적화",
  "전반적으로",
  "맥락에서",
  "측면에서",
  "가능성이 있습니다",
  "도움이 됩니다",
  "고려해야 합니다",
  "it is important",
  "in conclusion",
  "overall",
  "furthermore",
  "moreover",
  "as an ai"
];

const jumpPersonalMarkers = ["나는", "내가", "제가", "저는", "우리", "느꼈", "봤다", "겪었", "기억", "i ", "my ", "me "];

const jumpStyle = document.createElement("style");
jumpStyle.textContent = `
  .signal.has-target { cursor: pointer; }
  .signal.has-target:hover,
  .signal.has-target:focus {
    border-color: #1f7a68;
    box-shadow: 0 0 0 3px rgba(31, 122, 104, 0.12);
    outline: none;
  }
  .revision-card.jump-highlight {
    border-color: #14584c;
    box-shadow: 0 0 0 4px rgba(31, 122, 104, 0.2);
  }
`;
document.head.append(jumpStyle);

function jumpNormalize(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function jumpRepeatedGrams(text) {
  const words = jumpNormalize(text).split(/\s+/).filter((word) => word.length > 1);
  const grams = new Map();
  for (let index = 0; index < words.length - 2; index += 1) {
    const gram = words.slice(index, index + 3).join(" ");
    grams.set(gram, (grams.get(gram) || 0) + 1);
  }
  return [...grams.entries()].filter(([, count]) => count > 1).map(([gram]) => gram);
}

function jumpHasAny(text, markers) {
  const lower = text.toLowerCase();
  return markers.some((marker) => lower.includes(marker.toLowerCase()));
}

function jumpSyncTargets() {
  const signals = [...document.querySelectorAll(".signal")];
  const cards = [...document.querySelectorAll(".revision-card")];
  const texts = cards.map((card) => card.querySelector("textarea")?.value || "");
  if (!signals.length || !cards.length) return;

  const lengths = texts.map((text) => text.length);
  const averageLength = lengths.reduce((sum, value) => sum + value, 0) / Math.max(lengths.length, 1);
  const repeatedGrams = jumpRepeatedGrams(texts.join(" "));
  const targetSets = [
    texts.map((text, index) => jumpHasAny(text, jumpAiPhrases) ? index : -1).filter((index) => index >= 0),
    texts.map((text, index) => Math.abs(text.length - averageLength) < 18 ? index : -1).filter((index) => index >= 0),
    texts.map((text, index) => jumpHasAny(text, jumpPersonalMarkers) ? index : -1).filter((index) => index >= 0),
    texts.map((text, index) => /(습니다|됩니다|합니다|입니다)[.!?。！？]?$/.test(text.trim()) ? index : -1).filter((index) => index >= 0),
    texts.map((text, index) => repeatedGrams.some((gram) => jumpNormalize(text).includes(gram)) ? index : -1).filter((index) => index >= 0)
  ];

  cards.forEach((card, index) => {
    card.dataset.jumpIndex = String(index);
  });

  signals.forEach((signal, index) => {
    const targets = targetSets[index] || [];
    signal.dataset.jumpTargets = targets.join(",");
    signal.classList.toggle("has-target", targets.length > 0);
    signal.setAttribute("role", "button");
    signal.setAttribute("tabindex", "0");
    signal.setAttribute("title", "관련 문장으로 이동");
  });
}

function jumpToSignal(signal) {
  jumpSyncTargets();
  const targetIndex = (signal.dataset.jumpTargets || "").split(",").filter(Boolean)[0];
  const target = document.querySelector(`.revision-card[data-jump-index="${targetIndex}"]`) || document.querySelector(".revision-card");
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.remove("jump-highlight");
  window.setTimeout(() => target.classList.add("jump-highlight"), 20);
  window.setTimeout(() => target.classList.remove("jump-highlight"), 1600);
}

document.addEventListener("click", (event) => {
  const signal = event.target.closest(".signal");
  if (!signal) return;
  jumpToSignal(signal);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const signal = event.target.closest(".signal");
  if (!signal) return;
  event.preventDefault();
  jumpToSignal(signal);
});

new MutationObserver(jumpSyncTargets).observe(document.body, { childList: true, subtree: true });
jumpSyncTargets();
