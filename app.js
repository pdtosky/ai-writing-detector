const titleInput = document.querySelector("#titleInput");
const textInput = document.querySelector("#textInput");
const clearButton = document.querySelector("#clearButton");
const sampleButton = document.querySelector("#sampleButton");
const saveButton = document.querySelector("#saveButton");
const formatButton = document.querySelector("#formatButton");
const textStats = document.querySelector("#textStats");
const aiPercent = document.querySelector("#aiPercent");
const humanPercent = document.querySelector("#humanPercent");
const confidenceLabel = document.querySelector("#confidenceLabel");
const aiMeter = document.querySelector("#aiMeter");
const signalList = document.querySelector("#signalList");
const revisionList = document.querySelector("#revisionList");
const sentenceSummary = document.querySelector("#sentenceSummary");
let jumpHighlightTimer = 0;

const aiPhrases = [
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

const transitionWords = [
  "또한",
  "그러나",
  "따라서",
  "반면에",
  "예를 들어",
  "즉",
  "결국",
  "first",
  "second",
  "therefore",
  "however",
  "for example"
];

const personalMarkers = [
  "나는",
  "내가",
  "제가",
  "저는",
  "우리",
  "느꼈",
  "봤다",
  "겪었",
  "기억",
  "i ",
  "my ",
  "me "
];

const fictionHumanMarkers = [
  "서울",
  "한복판",
  "거리",
  "골목",
  "빌딩",
  "건물",
  "비",
  "눈",
  "바람",
  "하늘",
  "불빛",
  "그림자",
  "밤",
  "새벽",
  "속으로",
  "문득",
  "입술",
  "손끝",
  "시선",
  "숨",
  "웃",
  "떨",
  "멈칫",
  "중얼",
  "바라",
  "고개",
  "어깨",
  "가슴",
  "문",
  "방",
  "창",
  "소리"
];

const sampleText = `최근 인공지능 기술은 다양한 분야에서 빠르게 활용되고 있습니다. 특히 글쓰기, 번역, 자료 정리와 같은 작업에서 효율성을 높이는 데 도움이 됩니다. 그러나 이러한 변화는 창작자의 고유한 목소리와 책임에 대한 논의도 함께 필요하게 만듭니다. 결론적으로 AI는 도구로서 유용하지만, 사용자는 결과물을 비판적으로 검토하고 맥락에 맞게 수정해야 합니다.`;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？]|[다요죠음함임됨][.?!\s])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function countMatches(text, words) {
  const lower = text.toLowerCase();
  return words.reduce((count, word) => count + (lower.includes(word.toLowerCase()) ? 1 : 0), 0);
}

function standardDeviation(numbers) {
  if (numbers.length < 2) return 0;
  const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const variance = numbers.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / numbers.length;
  return Math.sqrt(variance);
}

function repeatedNgrams(text) {
  return repeatedNgramList(text).length;
}

function repeatedNgramList(text) {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);

  const grams = new Map();
  for (let index = 0; index < words.length - 2; index += 1) {
    const gram = words.slice(index, index + 3).join(" ");
    grams.set(gram, (grams.get(gram) || 0) + 1);
  }

  return [...grams.entries()].filter(([, count]) => count > 1).map(([gram]) => gram);
}

function sentenceHasRepeatedGram(sentence, repeatedGrams) {
  const normalized = sentence
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return repeatedGrams.some((gram) => normalized.includes(gram));
}

function lexicalDiversity(text) {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 0;
  return new Set(words).size / words.length;
}

function sentenceScore(sentence, averageLength) {
  return sentenceEvaluation(sentence, averageLength).score;
}

function sentenceEvaluation(sentence, averageLength) {
  if (!sentence.trim()) {
    return {
      score: 0,
      reasons: ["빈 문장이라 0점입니다."]
    };
  }

  const length = sentence.length;
  const phraseHits = countMatches(sentence, aiPhrases);
  const transitionHits = countMatches(sentence, transitionWords);
  const personalHits = countMatches(sentence, personalMarkers);
  const fictionHits = countMatches(sentence, fictionHumanMarkers);
  const hasSpecifics = /[0-9]{2,}|["“”'‘’]|년|월|일|원|%|km|kg|분|초/.test(sentence);
  const hasSceneConcrete = fictionHits >= 2 || /(서울|부산|인천|대구|광주|대전|울산|한복판|거리|골목|빌딩|건물|비|눈|바람|하늘|불빛|그림자)/.test(sentence);
  const formalEnding = /(습니다|됩니다|합니다|입니다)[.!?。！？]?$/.test(sentence);
  const explanatoryEnding = /(것이다|수 있다|해야 한다|필요하다|가능하다|보인다|의미한다)[.!?。！？]?$/.test(sentence);
  const abstractNouns = /(기술|분야|작업|효율|변화|논의|결과물|맥락|활용|방식|과정|측면|요소)/g;
  const abstractHits = (sentence.match(abstractNouns) || []).length;
  const hasDialogueOrAction = /["“”'‘’]|[.!?]\s*["“”'‘’]|(말했다|물었다|웃었다|걸었다|잡았다|돌아섰다|내려다봤다|올려다봤다|속삭였다|받아들이고 있었다|스며들었다|흘러내렸다|번졌다|젖었다)/.test(sentence);

  let score = 20;
  const reasons = ["기본 문장 점수 +20"];

  score += phraseHits * 26;
  if (phraseHits) reasons.push(`상투적 AI 표현 ${phraseHits}개 +${phraseHits * 26}`);

  score += transitionHits * 11;
  if (transitionHits) reasons.push(`전환어/정리 표현 ${transitionHits}개 +${transitionHits * 11}`);

  score += length > 85 ? 12 : 0;
  if (length > 85) reasons.push("긴 문장 +12");

  score += Math.abs(length - averageLength) < 18 ? 8 : 0;
  if (Math.abs(length - averageLength) < 18) reasons.push("주변 문장과 길이가 비슷함 +8");

  score += formalEnding ? 10 : 0;
  if (formalEnding) reasons.push("공식 문어체 종결 +10");

  score += explanatoryEnding ? 12 : 0;
  if (explanatoryEnding) reasons.push("설명문식 종결 +12");

  score += abstractHits >= 3 ? 12 : abstractHits * 3;
  if (abstractHits) reasons.push(`추상어 ${abstractHits}개 +${abstractHits >= 3 ? 12 : abstractHits * 3}`);

  score += hasSpecifics || hasSceneConcrete ? -5 : 3;
  reasons.push(hasSpecifics || hasSceneConcrete ? "구체적 장면/세부 정보 -5" : "구체적 장면 신호 부족 +3");

  score -= hasDialogueOrAction ? 6 : 0;
  if (hasDialogueOrAction) reasons.push("대사/행동/묘사형 동작 -6");

  score -= Math.min(fictionHits * 4, 10);
  if (fictionHits) reasons.push(`소설적 장면 단어 ${fictionHits}개 -${Math.min(fictionHits * 4, 10)}`);

  score -= personalHits * 14;
  if (personalHits) reasons.push(`개인적 표현 ${personalHits}개 -${personalHits * 14}`);

  return {
    score: clamp(score, 0, 100),
    reasons
  };
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
  const repeatedGrams = repeatedNgramList(clean);
  const repeats = repeatedGrams.length;
  const diversity = lexicalDiversity(clean);
  const punctuationVariety = new Set((clean.match(/[,.!?;:()\-"“”‘’]/g) || [])).size;
  const formalEndingRatio = sentences.length
    ? sentences.filter((sentence) => /(습니다|됩니다|합니다|입니다)[.!?。！？]?$/.test(sentence)).length / sentences.length
    : 0;

  let score = 8;
  score += phraseHits * 10;
  score += transitionHits * 4.5;
  score += repeats * 6;
  score += clean.length > 280 && lengthDeviation < 24 ? 18 : 0;
  score += clean.length > 280 && punctuationVariety < 4 ? 9 : 0;
  score += clean.length > 180 && formalEndingRatio > 0.65 ? 16 : 0;
  score += diversity > 0 && diversity < 0.46 ? 12 : 0;
  score -= personalHits * 7;
  score -= punctuationVariety > 7 ? 6 : 0;

  if (clean.length < 220) score = score * 0.74 + 12;
  const ai = Math.round(clamp(score, 0, 96));
  const sentenceDetails = sentences.map((sentence, index) => ({
    id: index,
    text: sentence,
    ...sentenceEvaluation(sentence, averageLength)
  }));
  const phraseTargets = sentenceDetails.filter((sentence) => countMatches(sentence.text, aiPhrases) > 0).map((sentence) => sentence.id);
  const lengthTargets = sentenceDetails
    .filter((sentence) => Math.abs(sentence.text.length - averageLength) < 18)
    .map((sentence) => sentence.id);
  const personalTargets = sentenceDetails.filter((sentence) => countMatches(sentence.text, personalMarkers) > 0).map((sentence) => sentence.id);
  const formalTargets = sentenceDetails
    .filter((sentence) => /(습니다|됩니다|합니다|입니다)[.!?。！？]?$/.test(sentence.text))
    .map((sentence) => sentence.id);
  const repeatTargets = sentenceDetails.filter((sentence) => sentenceHasRepeatedGram(sentence.text, repeatedGrams)).map((sentence) => sentence.id);

  return {
    ai,
    human: 100 - ai,
    sentences: sentenceDetails,
    signals: [
      {
        title: "상투적 AI 표현",
        detail: `${phraseHits}개 감지`,
        impact: phraseHits ? "AI 답변에서 자주 보이는 일반화 표현이 있습니다." : "뚜렷한 상투 표현은 적습니다.",
        targetIds: phraseTargets
      },
      {
        title: "문장 길이 균일도",
        detail: lengthDeviation ? `표준편차 ${lengthDeviation.toFixed(1)}` : "측정 불가",
        impact: lengthDeviation && lengthDeviation < 24 ? "문장 리듬이 비교적 고르게 반복됩니다." : "문장 리듬 변화가 어느 정도 있습니다.",
        targetIds: lengthTargets
      },
      {
        title: "개인 경험 신호",
        detail: `${personalHits}개 감지`,
        impact: personalHits ? "1인칭이나 경험 표현은 사람 작성 가능성을 높입니다." : "개인적 흔적이 거의 없습니다.",
        targetIds: personalTargets
      },
      {
        title: "문어체 균일도",
        detail: `${Math.round(formalEndingRatio * 100)}%`,
        impact: formalEndingRatio > 0.65 ? "공식적인 종결 패턴이 고르게 반복됩니다." : "종결 표현이 비교적 다양합니다.",
        targetIds: formalTargets
      },
      {
        title: "반복 구조",
        detail: `${repeats}개 감지`,
        impact: repeats ? "비슷한 3단어 묶음이 반복됩니다." : "눈에 띄는 반복 묶음은 적습니다.",
        targetIds: repeatTargets
      }
    ]
  };
}

function render() {
  const text = textInput.value;
  const sentences = splitSentences(text);
  textStats.textContent = `${text.trim().length.toLocaleString("ko-KR")}자 · ${sentences.length}문장`;

  if (!text.trim()) {
    aiPercent.textContent = "0%";
    humanPercent.textContent = "사람 작성 가능성 0%";
    confidenceLabel.textContent = "대기 중";
    aiMeter.style.width = "0%";
    signalList.innerHTML = "";
    sentenceSummary.textContent = "글을 입력해 주세요";
    revisionList.innerHTML = `<p class="muted">문장별 수정 카드가 여기에 표시됩니다.</p>`;
    return;
  }

  const result = analyze(text);
  updateScorePanel(result, "원문 기준");
  renderSignals(result.signals);
  updateSentenceSummary(result.sentences);

  if (!result.sentences.length) {
    revisionList.innerHTML = `<p class="muted">문장을 찾지 못했습니다. 글을 조금 더 길게 입력해 주세요.</p>`;
    return;
  }

  revisionList.innerHTML = result.sentences.map(renderRevisionCard).join("");
}

function updateScorePanel(result, suffix = "") {
  aiPercent.textContent = `${result.ai}%`;
  humanPercent.textContent = `사람 작성 가능성 ${result.human}%`;
  aiMeter.style.width = `${result.ai}%`;

  const baseLabel = textInput.value.trim().length < 220
    ? "짧은 글: 낮은 신뢰도"
    : result.ai >= 70
      ? "높은 의심"
      : result.ai >= 42
        ? "중간 의심"
        : "낮은 의심";
  confidenceLabel.textContent = suffix ? `${baseLabel} · ${suffix}` : baseLabel;
}

function renderSignals(signals) {
  signalList.innerHTML = signals
    .map(
      (signal) => `
        <article class="signal ${signal.targetIds.length ? "has-target" : ""}" role="button" tabindex="0" data-target-ids="${signal.targetIds.join(",")}" title="누를 때마다 다음 관련 문장으로 이동">
          <strong>${signal.title} · ${signal.detail}</strong>
          <span>${signal.impact}</span>
        </article>
      `
    )
    .join("");
}

function updateSentenceSummary(sentences) {
  const suspiciousCount = sentences.filter((sentence) => sentence.score >= 48).length;
  const mediumCount = sentences.filter((sentence) => sentence.score >= 28 && sentence.score < 48).length;
  const lowCount = sentences.length - suspiciousCount - mediumCount;
  sentenceSummary.textContent = `${sentences.length}개 전체 · 강한 의심 ${suspiciousCount} · 보통 ${mediumCount} · 낮음 ${lowCount}`;
}

function renderRevisionCard(sentence) {
  const { level, label } = scoreLevel(sentence.score);
  return `
    <article class="revision-card ${level}" data-sentence-id="${sentence.id}" data-original="${escapeHtml(sentence.text)}" data-original-score="${Math.round(sentence.score)}">
      <div class="revision-meta">
        <strong>${label}</strong>
        <span class="score-readout">
          <span class="original-score">${Math.round(sentence.score)}점</span>
          <span aria-hidden="true">→</span>
          <span class="live-score">${Math.round(sentence.score)}점</span>
          <span class="score-delta neutral">±0</span>
        </span>
      </div>
      <textarea aria-label="수정 문장">${escapeHtml(sentence.text)}</textarea>
      <div class="reason-list">${renderReasons(sentence.reasons)}</div>
      <p class="reason-detail" hidden></p>
      <div class="revision-actions">
        <span class="live-hint">수정하면 점수가 바로 바뀝니다</span>
        <button class="ghost-button compact apply-revision" type="button">본문에 반영</button>
      </div>
    </article>
  `;
}

function reasonExplanation(reason) {
  if (reason.includes("기본 문장 점수")) {
    return "모든 문장은 기본값에서 시작합니다. 여기에 문체 신호가 더해지거나 빠지면서 최종 의심 점수가 정해집니다.";
  }
  if (reason.includes("상투적 AI 표현")) {
    return "AI 답변에서 자주 보이는 일반화 표현입니다. 예: 결론적으로, 다양한, 효율적, 중요합니다 같은 말이 많으면 설명문처럼 보여 점수가 올라갑니다.";
  }
  if (reason.includes("전환어/정리 표현")) {
    return "또한, 그러나, 따라서처럼 글을 정리하는 연결어입니다. 너무 규칙적으로 쓰이면 AI가 정돈한 문장처럼 보여 점수가 올라갑니다.";
  }
  if (reason.includes("긴 문장")) {
    return "한 문장이 길면 정보가 매끈하게 압축된 설명문처럼 보일 수 있어 점수가 올라갑니다. 소설 문장이라면 호흡을 나누거나 행동을 섞으면 낮아질 수 있습니다.";
  }
  if (reason.includes("주변 문장과 길이가 비슷함")) {
    return "앞뒤 문장과 길이가 비슷하면 리듬이 일정하게 반복됩니다. AI 글은 문장 길이가 고르게 나오는 경우가 있어 점수가 올라갑니다.";
  }
  if (reason.includes("공식 문어체 종결")) {
    return "습니다, 됩니다, 합니다, 입니다 같은 공식적인 끝맺음입니다. 설명문이나 보고서 느낌이 강해져 점수가 올라갑니다.";
  }
  if (reason.includes("설명문식 종결")) {
    return "수 있다, 필요하다, 의미한다처럼 결론을 설명하는 끝맺음입니다. 창작 문장보다 해설문처럼 보여 점수가 올라갑니다.";
  }
  if (reason.includes("추상어")) {
    return "기술, 변화, 과정, 요소 같은 추상적인 단어가 많다는 뜻입니다. 장면보다 개념 설명이 많아 보이면 점수가 올라갑니다.";
  }
  if (reason.includes("구체적 장면/세부 정보")) {
    return "장소, 숫자, 시간, 감각처럼 구체적인 정보가 들어 있어 사람의 장면 묘사처럼 보입니다. 그래서 의심 점수를 낮춥니다.";
  }
  if (reason.includes("구체적 장면 신호 부족")) {
    return "장소, 행동, 감각, 세부 상황이 적어 설명만 남은 문장처럼 보입니다. 장면성이 부족하면 점수가 조금 올라갑니다.";
  }
  if (reason.includes("대사/행동/묘사형 동작")) {
    return "말했다, 걸었다, 바라봤다 같은 행동이나 대사 신호입니다. 소설 문장처럼 보여 의심 점수를 낮춥니다.";
  }
  if (reason.includes("소설적 장면 단어")) {
    return "비, 거리, 시선, 손끝, 그림자 같은 장면 단어입니다. 독자가 볼 수 있는 묘사가 들어가면 AI 설명문 느낌이 줄어 점수가 낮아집니다.";
  }
  if (reason.includes("개인적 표현")) {
    return "나는, 내가, 느꼈다처럼 개인의 경험이나 시점이 드러나는 표현입니다. 작성자의 흔적으로 보여 의심 점수를 낮춥니다.";
  }
  if (reason.includes("빈 문장")) {
    return "내용이 없는 문장은 분석할 문체 신호가 없어 0점으로 처리합니다.";
  }
  return "이 태그는 현재 문장에서 발견된 문체 신호입니다. +는 AI 의심 점수를 올리고, -는 의심 점수를 낮춥니다.";
}

function renderReasons(reasons) {
  return reasons
    .slice(0, 5)
    .map(
      (reason) => `
        <button class="reason-chip" type="button" data-explanation="${escapeHtml(reasonExplanation(reason))}">
          ${escapeHtml(reason)}
        </button>
      `
    )
    .join("");
}

function scoreLevel(score) {
  if (score >= 48) return { level: "suspicious", label: "강한 의심" };
  if (score >= 28) return { level: "medium", label: "보통" };
  return { level: "low", label: "낮음" };
}

function refreshLiveScores() {
  const cards = [...revisionList.querySelectorAll(".revision-card")];
  if (!cards.length) return;

  const editedSentences = cards.map((card) => card.querySelector("textarea").value.trim()).filter(Boolean);
  const averageLength = editedSentences.length
    ? editedSentences.reduce((sum, sentence) => sum + sentence.length, 0) / editedSentences.length
    : 0;

  const sentenceDetails = cards.map((card, index) => {
    const edited = card.querySelector("textarea").value.trim();
    const evaluation = sentenceEvaluation(edited, averageLength);
    updateRevisionCard(card, evaluation);
    return { id: index, text: edited, ...evaluation };
  });

  const previewText = buildPreviewTextFromCards(cards);
  const previewResult = analyze(previewText);
  updateScorePanel(previewResult, "수정 미리보기");
  renderSignals(previewResult.signals);
  updateSentenceSummary(sentenceDetails);
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
  const detail = card.querySelector(".reason-detail");
  if (detail) {
    detail.hidden = true;
    detail.textContent = "";
  }
}

function buildPreviewTextFromCards(cards) {
  return cards.reduce((draft, card) => {
    const original = card.dataset.original;
    const edited = card.querySelector("textarea").value.trim();
    return original && edited ? draft.replace(original, edited) : draft;
  }, textInput.value);
}

function applyRevision(card) {
  const original = card.dataset.original;
  const edited = card.querySelector("textarea").value.trim();
  if (!edited || !original) return;
  textInput.value = textInput.value.replace(original, edited);
  render();
}

function normalizeForUpload(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function saveDocument() {
  const body = normalizeForUpload(textInput.value);
  if (!body) {
    textInput.focus();
    return;
  }

  const title = titleInput.value.trim() || "수정본";
  const filename = `${safeFilename(title)}.txt`;
  const content = titleInput.value.trim() ? `${title}\n\n${body}` : body;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 80) || "수정본";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

textInput.addEventListener("input", render);
clearButton.addEventListener("click", () => {
  textInput.value = "";
  textInput.focus();
  render();
});
sampleButton.addEventListener("click", () => {
  titleInput.value = "AI 문체 수정 예시";
  textInput.value = sampleText;
  render();
});
saveButton.addEventListener("click", saveDocument);
formatButton.addEventListener("click", () => {
  textInput.value = normalizeForUpload(textInput.value);
  render();
});
revisionList.addEventListener("input", (event) => {
  if (!event.target.matches(".revision-card textarea")) return;
  refreshLiveScores();
});
revisionList.addEventListener("click", (event) => {
  const reasonChip = event.target.closest(".reason-chip");
  if (reasonChip) {
    const card = reasonChip.closest(".revision-card");
    const detail = card.querySelector(".reason-detail");
    card.querySelectorAll(".reason-chip").forEach((chip) => chip.classList.remove("is-active"));
    reasonChip.classList.add("is-active");
    detail.textContent = reasonChip.dataset.explanation;
    detail.hidden = false;
    return;
  }

  const button = event.target.closest(".apply-revision");
  if (!button) return;
  applyRevision(button.closest(".revision-card"));
});

function jumpToSignalTargets(signalCard) {
  const ids = signalCard.dataset.targetIds.split(",").filter(Boolean);
  const targets = ids
    .map((id) => revisionList.querySelector(`[data-sentence-id="${id}"]`))
    .filter(Boolean);
  const cursor = Number(signalCard.dataset.jumpCursor || "0");
  const target = targets.length
    ? targets[cursor % targets.length]
    : revisionList.querySelector(".revision-card");

  if (!target) return;
  signalCard.dataset.jumpCursor = String((cursor + 1) % Math.max(targets.length, 1));
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  window.clearTimeout(jumpHighlightTimer);
  revisionList.querySelectorAll(".jump-highlight").forEach((card) => card.classList.remove("jump-highlight"));
  void target.offsetWidth;
  target.classList.add("jump-highlight");
  jumpHighlightTimer = window.setTimeout(() => target.classList.remove("jump-highlight"), 1600);
}

signalList.addEventListener("click", (event) => {
  const signalCard = event.target.closest(".signal");
  if (!signalCard) return;
  event.stopPropagation();
  jumpToSignalTargets(signalCard);
});

signalList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const signalCard = event.target.closest(".signal");
  if (!signalCard) return;
  event.preventDefault();
  event.stopPropagation();
  jumpToSignalTargets(signalCard);
});

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
