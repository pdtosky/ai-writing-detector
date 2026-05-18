const $ = (selector) => document.querySelector(selector);

const titleInput = $("#titleInput");
const textInput = $("#textInput");
const clearButton = $("#clearButton");
const sampleButton = $("#sampleButton");
const saveButton = $("#saveButton");
const formatButton = $("#formatButton");
const textStats = $("#textStats");
const aiPercent = $("#aiPercent");
const humanPercent = $("#humanPercent");
const confidenceLabel = $("#confidenceLabel");
const aiMeter = $("#aiMeter");
const signalList = $("#signalList");
const revisionList = $("#revisionList");
const sentenceSummary = $("#sentenceSummary");

const aiPhrases = ["결론적으로", "요약하자면", "중요합니다", "다양한", "효율적", "최적화", "전반적으로", "맥락에서", "측면에서", "가능성이 있습니다", "도움이 됩니다", "고려해야 합니다", "it is important", "in conclusion", "overall", "furthermore", "moreover", "as an ai"];
const transitionWords = ["또한", "그러나", "따라서", "반면에", "예를 들어", "즉", "결국", "first", "second", "therefore", "however", "for example"];
const personalMarkers = ["나는", "내가", "제가", "저는", "우리", "느꼈", "봤다", "겪었", "기억", "i ", "my ", "me "];
const sceneMarkers = ["서울", "한복판", "거리", "골목", "빌딩", "건물", "비", "눈", "바람", "하늘", "불빛", "그림자", "밤", "새벽", "속으로", "문득", "입술", "손끝", "시선", "숨", "웃", "떨", "멈칫", "중얼", "바라", "고개", "어깨", "가슴", "문", "방", "창", "소리"];
const sampleText = "최근 인공지능 기술은 다양한 분야에서 빠르게 활용되고 있습니다. 특히 글쓰기, 번역, 자료 정리와 같은 작업에서 효율성을 높이는 데 도움이 됩니다. 그러나 이러한 변화는 창작자의 고유한 목소리와 책임에 대한 논의도 함께 필요하게 만듭니다. 결론적으로 AI는 도구로서 유용하지만, 사용자는 결과물을 비판적으로 검토하고 맥락에 맞게 수정해야 합니다.";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function splitSentences(text) {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?。！？]|[다요죠음함임됨][.?!\s])/).map((sentence) => sentence.trim()).filter(Boolean);
}

function countMatches(text, words) {
  const lower = text.toLowerCase();
  return words.reduce((count, word) => count + (lower.includes(word.toLowerCase()) ? 1 : 0), 0);
}

function standardDeviation(numbers) {
  if (numbers.length < 2) return 0;
  const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  return Math.sqrt(numbers.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / numbers.length);
}

function lexicalDiversity(text) {
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return words.length ? new Set(words).size / words.length : 0;
}

function repeatedNgrams(text) {
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((word) => word.length > 1);
  const grams = new Map();
  for (let index = 0; index < words.length - 2; index += 1) {
    const gram = words.slice(index, index + 3).join(" ");
    grams.set(gram, (grams.get(gram) || 0) + 1);
  }
  return [...grams.values()].filter((count) => count > 1).length;
}

function sentenceEvaluation(sentence, averageLength) {
  if (!sentence.trim()) return { score: 0, reasons: ["빈 문장이라 0점입니다."] };

  const length = sentence.length;
  const phraseHits = countMatches(sentence, aiPhrases);
  const transitionHits = countMatches(sentence, transitionWords);
  const personalHits = countMatches(sentence, personalMarkers);
  const sceneHits = countMatches(sentence, sceneMarkers);
  const hasSpecifics = /[0-9]{2,}|["“”'‘’]|년|월|일|원|%|km|kg|분|초/.test(sentence);
  const hasSceneConcrete = sceneHits >= 2 || /(서울|부산|인천|대구|광주|대전|울산|한복판|거리|골목|빌딩|건물|비|눈|바람|하늘|불빛|그림자)/.test(sentence);
  const formalEnding = /(습니다|됩니다|합니다|입니다)[.!?。！？]?$/.test(sentence);
  const explanatoryEnding = /(것이다|수 있다|해야 한다|필요하다|가능하다|보인다|의미한다)[.!?。！？]?$/.test(sentence);
  const abstractHits = (sentence.match(/(기술|분야|작업|효율|변화|논의|결과물|맥락|활용|방식|과정|측면|요소)/g) || []).length;
  const hasAction = /["“”'‘’]|[.!?]\s*["“”'‘’]|(말했다|물었다|웃었다|걸었다|잡았다|돌아섰다|내려다봤다|올려다봤다|속삭였다|받아들이고 있었다|스며들었다|흘러내렸다|번졌다|젖었다)/.test(sentence);

  let score = 20;
  const reasons = ["기본 문장 점수 +20"];

  if (phraseHits) { score += phraseHits * 26; reasons.push(`상투적 AI 표현 ${phraseHits}개 +${phraseHits * 26}`); }
  if (transitionHits) { score += transitionHits * 11; reasons.push(`전환어/정리 표현 ${transitionHits}개 +${transitionHits * 11}`); }
  if (length > 85) { score += 12; reasons.push("긴 문장 +12"); }
  if (Math.abs(length - averageLength) < 18) { score += 8; reasons.push("주변 문장과 길이가 비슷함 +8"); }
  if (formalEnding) { score += 10; reasons.push("공식 문어체 종결 +10"); }
  if (explanatoryEnding) { score += 12; reasons.push("설명문식 종결 +12"); }
  if (abstractHits) { const add = abstractHits >= 3 ? 12 : abstractHits * 3; score += add; reasons.push(`추상어 ${abstractHits}개 +${add}`); }

  if (hasSpecifics || hasSceneConcrete) { score -= 5; reasons.push("구체적 장면/세부 정보 -5"); }
  else { score += 3; reasons.push("구체적 장면 신호 부족 +3"); }
  if (hasAction) { score -= 6; reasons.push("대사/행동/묘사형 동작 -6"); }
  if (sceneHits) { const sub = Math.min(sceneHits * 4, 10); score -= sub; reasons.push(`소설적 장면 단어 ${sceneHits}개 -${sub}`); }
  if (personalHits) { score -= personalHits * 14; reasons.push(`개인적 표현 ${personalHits}개 -${personalHits * 14}`); }

  return { score: clamp(score, 0, 100), reasons };
}

function analyze(text) {
  const clean = text.trim();
  const sentences = splitSentences(clean);
  const lengths = sentences.map((sentence) => sentence.length);
  const averageLength = lengths.length ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0;
  const lengthDeviation = standardDeviation(lengths);
  const phraseHits = countMatches(clean, aiPhrases);
  const transitionHits = countMatches(clean, transitionWords);
  const personalHits = countMatches(clean, personalMarkers);
  const repeats = repeatedNgrams(clean);
  const diversity = lexicalDiversity(clean);
  const punctuationVariety = new Set((clean.match(/[,.!?;:()\-"“”‘’]/g) || [])).size;
  const formalEndingRatio = sentences.length ? sentences.filter((sentence) => /(습니다|됩니다|합니다|입니다)[.!?。！？]?$/.test(sentence)).length / sentences.length : 0;

  let score = 8 + phraseHits * 10 + transitionHits * 4.5 + repeats * 6;
  score += clean.length > 280 && lengthDeviation < 24 ? 18 : 0;
  score += clean.length > 280 && punctuationVariety < 4 ? 9 : 0;
  score += clean.length > 180 && formalEndingRatio > 0.65 ? 16 : 0;
  score += diversity > 0 && diversity < 0.46 ? 12 : 0;
  score -= personalHits * 7;
  score -= punctuationVariety > 7 ? 6 : 0;
  if (clean.length < 220) score = score * 0.74 + 12;

  const ai = Math.round(clamp(score, 0, 96));
  return {
    ai,
    human: 100 - ai,
    sentences: sentences.map((sentence, index) => ({ id: index, text: sentence, ...sentenceEvaluation(sentence, averageLength) })),
    signals: [
      { title: "상투적 AI 표현", detail: `${phraseHits}개 감지`, impact: phraseHits ? "AI 답변에서 자주 보이는 일반화 표현이 있습니다." : "뚜렷한 상투 표현은 적습니다." },
      { title: "문장 길이 균일도", detail: lengthDeviation ? `표준편차 ${lengthDeviation.toFixed(1)}` : "측정 불가", impact: lengthDeviation && lengthDeviation < 24 ? "문장 리듬이 비교적 고르게 반복됩니다." : "문장 리듬 변화가 어느 정도 있습니다." },
      { title: "개인 경험 신호", detail: `${personalHits}개 감지`, impact: personalHits ? "1인칭이나 경험 표현은 사람 작성 가능성을 높입니다." : "개인적 흔적이 거의 없습니다." },
      { title: "문어체 균일도", detail: `${Math.round(formalEndingRatio * 100)}%`, impact: formalEndingRatio > 0.65 ? "공식적인 종결 패턴이 고르게 반복됩니다." : "종결 표현이 비교적 다양합니다." },
      { title: "반복 구조", detail: `${repeats}개 감지`, impact: repeats ? "비슷한 3단어 묶음이 반복됩니다." : "눈에 띄는 반복 묶음은 적습니다." }
    ]
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

function scoreLevel(score) {
  if (score >= 48) return { level: "suspicious", label: "강한 의심" };
  if (score >= 28) return { level: "medium", label: "보통" };
  return { level: "low", label: "낮음" };
}

function renderReasons(reasons) {
  return reasons.slice(0, 5).map((reason) => `<span>${escapeHtml(reason)}</span>`).join("");
}

function renderRevisionCard(sentence) {
  const { level, label } = scoreLevel(sentence.score);
  return `<article class="revision-card ${level}" data-original="${escapeHtml(sentence.text)}" data-original-score="${Math.round(sentence.score)}">
    <div class="revision-meta"><strong>${label}</strong><span class="score-readout"><span class="original-score">${Math.round(sentence.score)}점</span><span aria-hidden="true">→</span><span class="live-score">${Math.round(sentence.score)}점</span><span class="score-delta neutral">±0</span></span></div>
    <textarea aria-label="수정 문장">${escapeHtml(sentence.text)}</textarea>
    <div class="reason-list">${renderReasons(sentence.reasons)}</div>
    <div class="revision-actions"><span class="live-hint">수정하면 점수가 바로 바뀝니다</span><button class="ghost-button compact apply-revision" type="button">본문에 반영</button></div>
  </article>`;
}

function updateScorePanel(result, suffix = "") {
  aiPercent.textContent = `${result.ai}%`;
  humanPercent.textContent = `사람 작성 가능성 ${result.human}%`;
  aiMeter.style.width = `${result.ai}%`;
  const baseLabel = textInput.value.trim().length < 220 ? "짧은 글: 낮은 신뢰도" : result.ai >= 70 ? "높은 의심" : result.ai >= 42 ? "중간 의심" : "낮은 의심";
  confidenceLabel.textContent = suffix ? `${baseLabel} · ${suffix}` : baseLabel;
}

function renderSignals(signals) {
  signalList.innerHTML = signals.map((signal) => `<article class="signal"><strong>${signal.title} · ${signal.detail}</strong><span>${signal.impact}</span></article>`).join("");
}

function updateSentenceSummary(sentences) {
  const suspiciousCount = sentences.filter((sentence) => sentence.score >= 48).length;
  const mediumCount = sentences.filter((sentence) => sentence.score >= 28 && sentence.score < 48).length;
  const lowCount = sentences.length - suspiciousCount - mediumCount;
  sentenceSummary.textContent = `${sentences.length}개 전체 · 강한 의심 ${suspiciousCount} · 보통 ${mediumCount} · 낮음 ${lowCount}`;
}

function render() {
  const text = textInput.value;
  const sentences = splitSentences(text);
  textStats.textContent = `${text.trim().length.toLocaleString("ko-KR")}자 · ${sentences.length}문장`;
  if (!text.trim()) {
    updateScorePanel({ ai: 0, human: 0 }, "대기 중");
    signalList.innerHTML = "";
    sentenceSummary.textContent = "글을 입력해 주세요";
    revisionList.innerHTML = `<p class="muted">문장별 수정 카드가 여기에 표시됩니다.</p>`;
    return;
  }
  const result = analyze(text);
  updateScorePanel(result, "원문 기준");
  renderSignals(result.signals);
  updateSentenceSummary(result.sentences);
  revisionList.innerHTML = result.sentences.length ? result.sentences.map(renderRevisionCard).join("") : `<p class="muted">문장을 찾지 못했습니다. 글을 조금 더 길게 입력해 주세요.</p>`;
}

function updateRevisionCard(card, evaluation) {
  const score = evaluation.score;
  const { level, label } = scoreLevel(score);
  const originalScore = Number(card.dataset.originalScore || score);
  const delta = Math.round(score - originalScore);
  card.classList.remove("suspicious", "medium", "low");
  card.classList.add(level);
  card.querySelector(".revision-meta strong").textContent = label;
  card.querySelector(".live-score").textContent = `${Math.round(score)}점`;
  const deltaNode = card.querySelector(".score-delta");
  deltaNode.textContent = delta === 0 ? "±0" : delta > 0 ? `+${delta}` : `${delta}`;
  deltaNode.classList.remove("better", "worse", "neutral");
  deltaNode.classList.add(delta < 0 ? "better" : delta > 0 ? "worse" : "neutral");
  card.querySelector(".reason-list").innerHTML = renderReasons(evaluation.reasons);
}

function buildPreviewTextFromCards(cards) {
  return cards.reduce((draft, card) => {
    const original = card.dataset.original;
    const edited = card.querySelector("textarea").value.trim();
    return original && edited ? draft.replace(original, edited) : draft;
  }, textInput.value);
}

function refreshLiveScores() {
  const cards = [...revisionList.querySelectorAll(".revision-card")];
  if (!cards.length) return;
  const editedSentences = cards.map((card) => card.querySelector("textarea").value.trim()).filter(Boolean);
  const averageLength = editedSentences.length ? editedSentences.reduce((sum, sentence) => sum + sentence.length, 0) / editedSentences.length : 0;
  const sentenceDetails = cards.map((card, index) => {
    const evaluation = sentenceEvaluation(card.querySelector("textarea").value.trim(), averageLength);
    updateRevisionCard(card, evaluation);
    return { id: index, text: card.querySelector("textarea").value.trim(), ...evaluation };
  });
  const previewResult = analyze(buildPreviewTextFromCards(cards));
  updateScorePanel(previewResult, "수정 미리보기");
  renderSignals(previewResult.signals);
  updateSentenceSummary(sentenceDetails);
}

function applyRevision(card) {
  const original = card.dataset.original;
  const edited = card.querySelector("textarea").value.trim();
  if (!edited || !original) return;
  textInput.value = textInput.value.replace(original, edited);
  render();
}

function normalizeForUpload(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").split("\n").map((line) => line.trimEnd()).join("\n").trim();
}

function safeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 80) || "수정본";
}

function saveDocument() {
  const body = normalizeForUpload(textInput.value);
  if (!body) return textInput.focus();
  const title = titleInput.value.trim() || "수정본";
  const content = titleInput.value.trim() ? `${title}\n\n${body}` : body;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(title)}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

textInput.addEventListener("input", render);
clearButton.addEventListener("click", () => { textInput.value = ""; textInput.focus(); render(); });
sampleButton.addEventListener("click", () => { titleInput.value = "AI 문체 수정 예시"; textInput.value = sampleText; render(); });
saveButton.addEventListener("click", saveDocument);
formatButton.addEventListener("click", () => { textInput.value = normalizeForUpload(textInput.value); render(); });
revisionList.addEventListener("input", (event) => { if (event.target.matches(".revision-card textarea")) refreshLiveScores(); });
revisionList.addEventListener("click", (event) => { const button = event.target.closest(".apply-revision"); if (button) applyRevision(button.closest(".revision-card")); });

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
