const fmt = new Intl.NumberFormat("ko-KR");
const won = (value) => `${fmt.format(Math.round(value))}원`;
const manwon = (value) => `${fmt.format(Math.round(value / 10000))}만원`;

const state = JSON.parse(JSON.stringify(window.retirementDefaults));

const fields = [
  "birthYear",
  "currentAge",
  "currentYear",
  "retirementAge",
  "publicPensionAge",
  "planUntilAge",
  "monthlyLivingCost",
  "annualRealReturn",
  "monthlyAdditionalSaving",
  "nationalPensionMonthly",
  "dcIrpBalance",
  "personalPensionBalance",
  "emergencyFundMonths"
];

function realAnnualRate() {
  return Number(state.assumptions.annualRealReturn) / 100;
}

function monthlyRate() {
  return Math.pow(1 + realAnnualRate(), 1 / 12) - 1;
}

function currentAge() {
  return Number(state.person.currentAge);
}

function futureValue(balance, years) {
  return balance * Math.pow(1 + realAnnualRate(), years);
}

function annuityPresentValue(monthlyGap, years) {
  const r = realAnnualRate();
  const annualGap = Math.max(0, monthlyGap) * 12;
  if (r === 0) return annualGap * years;
  return annualGap * (1 - Math.pow(1 + r, -years)) / r;
}

function monthlySavingNeeded(targetFutureValue, currentBalance, years) {
  const currentFutureValue = futureValue(currentBalance, years);
  const gap = Math.max(0, targetFutureValue - currentFutureValue);
  const r = monthlyRate();
  const months = years * 12;
  if (months <= 0) return gap;
  if (r === 0) return gap / months;
  return gap / ((Math.pow(1 + r, months) - 1) / r);
}

function calculate(customLivingCost = state.assumptions.monthlyLivingCost) {
  const ageNow = currentAge();
  const retireAge = Number(state.person.retirementAge);
  const pensionAge = Number(state.person.publicPensionAge);
  const endAge = Number(state.person.planUntilAge);
  const yearsToRetire = Math.max(0, retireAge - ageNow);
  const yearsToPension = Math.max(0, pensionAge - ageNow);
  const bridgeYears = Math.max(0, pensionAge - retireAge);
  const pensionYears = Math.max(0, endAge - pensionAge);
  const living = Number(customLivingCost);
  const national = Number(state.pensions.nationalPensionMonthly);
  const currentBalance =
    Number(state.pensions.dcIrpBalance) + Number(state.pensions.personalPensionBalance);

  const bridgeNeedAtRetire = annuityPresentValue(living, bridgeYears);
  const postPensionNeedAtPension = annuityPresentValue(living - national, pensionYears);
  const postPensionNeedAtRetire =
    postPensionNeedAtPension / Math.pow(1 + realAnnualRate(), bridgeYears);
  const needAtRetire = bridgeNeedAtRetire + postPensionNeedAtRetire;
  const currentBalanceAtRetire = futureValue(currentBalance, yearsToRetire);
  const monthlyNeed = monthlySavingNeeded(needAtRetire, currentBalance, yearsToRetire);
  const projectedWithSaving =
    currentBalanceAtRetire +
    state.assumptions.monthlyAdditionalSaving *
      (realAnnualRate() === 0
        ? yearsToRetire * 12
        : (Math.pow(1 + monthlyRate(), yearsToRetire * 12) - 1) / monthlyRate());

  return {
    ageNow,
    yearsToRetire,
    yearsToPension,
    bridgeYears,
    pensionYears,
    living,
    national,
    currentBalance,
    bridgeNeedAtRetire,
    postPensionNeedAtRetire,
    needAtRetire,
    currentBalanceAtRetire,
    monthlyNeed,
    projectedWithSaving,
    surplusAtRetire: projectedWithSaving - needAtRetire,
    monthlyGapAfterPension: Math.max(0, living - national)
  };
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function setStatus(message, type = "info") {
  const status = document.getElementById("sheetStatus");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = type;
}

function updateInputs() {
  for (const id of fields) {
    const input = document.getElementById(id);
    if (!input) continue;
    if (id in state.person) input.value = state.person[id];
    if (id in state.assumptions) input.value = state.assumptions[id];
    if (id in state.pensions) input.value = state.pensions[id];
  }
}

function readInputs() {
  for (const id of fields) {
    const input = document.getElementById(id);
    if (!input) continue;
    const value = Number(input.value || 0);
    if (id in state.person) state.person[id] = value;
    if (id in state.assumptions) state.assumptions[id] = value;
    if (id in state.pensions) state.pensions[id] = value;
  }
}

function renderAccounts() {
  const tbody = document.getElementById("accountsBody");
  tbody.innerHTML = state.accounts
    .map(
      (account) => `
      <tr>
        <td>${account.institution}</td>
        <td>${account.type}</td>
        <td>${account.product}</td>
        <td>${account.openedAt}</td>
        <td>${account.pensionStartDate}</td>
        <td class="num">${won(account.balance)}</td>
        <td>${account.asOf}</td>
      </tr>`
    )
    .join("");
}

function renderScenarioCards() {
  const wrap = document.getElementById("scenarioCards");
  wrap.innerHTML = state.scenarios
    .map((scenario) => {
      const result = calculate(scenario.monthlyLivingCost);
      return `
      <article class="scenario-card">
        <div>
          <span class="pill">${scenario.name}</span>
          <h3>${won(scenario.monthlyLivingCost)} / 월</h3>
        </div>
        <dl>
          <div><dt>65세 이후 부족액</dt><dd>${won(result.monthlyGapAfterPension)} / 월</dd></div>
          <div><dt>은퇴시점 필요자금</dt><dd>${manwon(result.needAtRetire)}</dd></div>
          <div><dt>필요 추가저축</dt><dd>${won(result.monthlyNeed)} / 월</dd></div>
        </dl>
      </article>`;
    })
    .join("");
}

function renderKanban(result) {
  const items = [
    {
      lane: "지금",
      title: "자동이체 기준 확정",
      body: `기준 생활비에서는 월 ${won(result.monthlyNeed)} 추가 적립이 필요합니다.`,
      status: "이번 달"
    },
    {
      lane: "1년",
      title: "IRP/연금저축 한도 점검",
      body: "세액공제 한도 안에서 납입을 먼저 채우고 남는 금액은 ISA 또는 일반 투자로 분리합니다.",
      status: "연 1회"
    },
    {
      lane: "5년",
      title: "수익률과 상품 재점검",
      body: "DC/IRP 상품의 주식형, 채권형 비중과 수수료를 확인해 장기 수익률을 관리합니다.",
      status: "반기"
    },
    {
      lane: "50대",
      title: "브릿지 자금 분리",
      body: "60~65세 생활비는 변동성 낮은 자산으로 옮겨 국민연금 전 공백을 관리합니다.",
      status: "전환"
    }
  ];
  document.getElementById("kanban").innerHTML = items
    .map(
      (item) => `
      <section class="lane">
        <div class="lane-title">${item.lane}<span>${item.status}</span></div>
        <article class="task">
          <h3>${item.title}</h3>
          <p>${item.body}</p>
        </article>
      </section>`
    )
    .join("");
}

function drawLineChart(canvas, labels, series) {
  const ctx = canvas.getContext("2d");
  const tokens = getComputedStyle(document.documentElement);
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth * ratio;
  const height = canvas.clientHeight * ratio;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  const pad = 48 * ratio;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const min = Math.min(...series.flatMap((s) => s.values), 0);
  const colors = [
    tokens.getPropertyValue("--color-accent-info").trim(),
    tokens.getPropertyValue("--color-accent-positive").trim(),
    tokens.getPropertyValue("--color-accent-warn").trim()
  ];

  ctx.strokeStyle = tokens.getPropertyValue("--color-border-muted").trim();
  ctx.lineWidth = 1 * ratio;
  ctx.font = `${12 * ratio}px Arial`;
  ctx.fillStyle = tokens.getPropertyValue("--color-text-secondary").trim();
  for (let i = 0; i <= 4; i++) {
    const y = pad + ((height - pad * 1.7) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad / 2, y);
    ctx.stroke();
    const value = max - ((max - min) * i) / 4;
    ctx.fillText(manwon(value), 8 * ratio, y + 4 * ratio);
  }

  series.forEach((s, idx) => {
    ctx.strokeStyle = colors[idx % colors.length];
    ctx.lineWidth = 3 * ratio;
    ctx.beginPath();
    s.values.forEach((value, i) => {
      const x = pad + ((width - pad * 1.6) * i) / Math.max(1, labels.length - 1);
      const y = pad + ((height - pad * 1.7) * (max - value)) / Math.max(1, max - min);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = colors[idx % colors.length];
    ctx.fillText(s.name, width - 180 * ratio, (26 + idx * 22) * ratio);
  });

  ctx.fillStyle = tokens.getPropertyValue("--color-text-secondary").trim();
  labels.forEach((label, i) => {
    if (i % Math.ceil(labels.length / 6) !== 0 && i !== labels.length - 1) return;
    const x = pad + ((width - pad * 1.6) * i) / Math.max(1, labels.length - 1);
    ctx.fillText(label, x - 14 * ratio, height - 16 * ratio);
  });
}

function drawBarChart(canvas, values) {
  const ctx = canvas.getContext("2d");
  const tokens = getComputedStyle(document.documentElement);
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth * ratio;
  const height = canvas.clientHeight * ratio;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  const pad = 44 * ratio;
  const max = Math.max(...values.map((v) => v.value), 1);
  const barW = (width - pad * 2) / values.length - 18 * ratio;
  ctx.font = `${12 * ratio}px Arial`;
  values.forEach((item, i) => {
    const x = pad + i * ((width - pad * 2) / values.length) + 9 * ratio;
    const h = ((height - pad * 2) * item.value) / max;
    const y = height - pad - h;
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = tokens.getPropertyValue("--color-text-primary").trim();
    ctx.fillText(item.label, x, height - 18 * ratio);
    ctx.fillText(manwon(item.value), x, y - 8 * ratio);
  });
}

function renderCharts(result) {
  const labels = [];
  const base = [];
  const saved = [];
  let balance = result.currentBalance;
  let balanceSaved = result.currentBalance;
  for (let age = result.ageNow; age <= state.person.retirementAge; age++) {
    labels.push(`${age}세`);
    base.push(balance);
    saved.push(balanceSaved);
    balance = futureValue(balance, 1);
    const monthly = monthlyRate();
    balanceSaved =
      futureValue(balanceSaved, 1) +
      state.assumptions.monthlyAdditionalSaving *
        (monthly === 0 ? 12 : (Math.pow(1 + monthly, 12) - 1) / monthly);
  }
  drawLineChart(document.getElementById("assetChart"), labels, [
    { name: "현재 적립금만", values: base },
    { name: "추가저축 반영", values: saved },
    { name: "필요자금", values: labels.map(() => result.needAtRetire) }
  ]);
  drawBarChart(document.getElementById("needChart"), [
    { label: "60~65세", value: result.bridgeNeedAtRetire, color: getComputedStyle(document.documentElement).getPropertyValue("--color-accent-info").trim() },
    { label: "65세 이후", value: result.postPensionNeedAtRetire, color: getComputedStyle(document.documentElement).getPropertyValue("--color-accent-positive").trim() },
    { label: "현재예상", value: result.projectedWithSaving, color: getComputedStyle(document.documentElement).getPropertyValue("--color-accent-warn").trim() }
  ]);
}

function exportMarkdown(result) {
  return `# 내 은퇴라이프 설계 대시보드

기준일: ${state.person.currentYear}-05-15

## 핵심 요약

| 항목 | 값 |
|---|---:|
| 현재 나이 추정 | ${result.ageNow}세 |
| 은퇴 목표 | ${state.person.retirementAge}세 |
| 국민연금 개시 | ${state.person.publicPensionAge}세 |
| 월 생활비 목표 | ${won(result.living)} |
| 국민연금 예상액 | ${won(result.national)} / 월 |
| DC/IRP 현재 적립금 | ${won(state.pensions.dcIrpBalance)} |
| 기준 추가저축 필요액 | ${won(result.monthlyNeed)} / 월 |

## 연금 계좌

| 금융회사 | 유형 | 상품 | 가입일 | 연금개시 예정 | 적립금 | 조회기준일 |
|---|---|---|---|---|---:|---|
${state.accounts
  .map(
    (a) =>
      `| ${a.institution} | ${a.type} | ${a.product} | ${a.openedAt} | ${a.pensionStartDate} | ${won(a.balance)} | ${a.asOf} |`
  )
  .join("\n")}

## 실행 칸반

| 단계 | 할 일 | 기준 |
|---|---|---|
| 지금 | 자동이체 기준 확정 | 월 ${won(result.monthlyNeed)} |
| 1년 | IRP/연금저축 한도 점검 | 세액공제 우선 |
| 5년 | 수익률과 상품 재점검 | 수수료, 자산배분 |
| 50대 | 브릿지 자금 분리 | 60~65세 생활비 안정화 |
`;
}

function render() {
  readInputs();
  const result = calculate();
  setText("currentAgeDisplay", `${result.ageNow}세`);
  setText("yearsToRetire", `${result.yearsToRetire}년`);
  setText("currentBalance", won(result.currentBalance));
  setText("monthlyNeed", won(result.monthlyNeed));
  setText("bridgeNeed", manwon(result.bridgeNeedAtRetire));
  setText("afterPensionGap", `${won(result.monthlyGapAfterPension)} / 월`);
  setText("retireNeed", manwon(result.needAtRetire));
  setText("projectedBalance", manwon(result.projectedWithSaving));
  setText("surplus", `${result.surplusAtRetire >= 0 ? "+" : ""}${manwon(result.surplusAtRetire)}`);
  renderAccounts();
  renderScenarioCards();
  renderKanban(result);
  renderCharts(result);
  document.getElementById("markdownPreview").value = exportMarkdown(result);
}

function buildSheetPayload() {
  readInputs();
  const result = calculate();
  return {
    updatedAt: new Date().toISOString(),
    person: state.person,
    assumptions: state.assumptions,
    pensions: state.pensions,
    accounts: state.accounts,
    scenarios: state.scenarios,
    summary: {
      currentAge: result.ageNow,
      yearsToRetire: result.yearsToRetire,
      currentBalance: result.currentBalance,
      monthlyNeed: Math.round(result.monthlyNeed),
      bridgeNeedAtRetire: Math.round(result.bridgeNeedAtRetire),
      monthlyGapAfterPension: Math.round(result.monthlyGapAfterPension),
      needAtRetire: Math.round(result.needAtRetire),
      projectedWithSaving: Math.round(result.projectedWithSaving),
      surplusAtRetire: Math.round(result.surplusAtRetire)
    }
  };
}

function applySheetPayload(payload) {
  if (!payload || typeof payload !== "object") return;
  Object.assign(state.person, payload.person || {});
  Object.assign(state.assumptions, payload.assumptions || {});
  Object.assign(state.pensions, payload.pensions || {});
  if (Array.isArray(payload.accounts)) state.accounts = payload.accounts;
  if (Array.isArray(payload.scenarios)) state.scenarios = payload.scenarios;
  updateInputs();
  render();
}

function endpointValue() {
  return document.getElementById("sheetEndpoint").value.trim();
}

async function saveToSheet() {
  const endpoint = endpointValue();
  if (!endpoint) {
    setStatus("Apps Script 웹앱 URL을 먼저 입력하세요.", "error");
    return;
  }
  setStatus("Google Sheet에 저장 중입니다...", "loading");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save", payload: buildSheetPayload() })
    });
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || "저장 실패");
    localStorage.setItem("retirementPlannerSheetEndpoint", endpoint);
    setStatus(`저장 완료: ${data.updatedAt || "방금"}`, "ok");
  } catch (error) {
    setStatus(`저장 실패: ${error.message}`, "error");
  }
}

async function loadFromSheet() {
  const endpoint = endpointValue();
  if (!endpoint) {
    setStatus("Apps Script 웹앱 URL을 먼저 입력하세요.", "error");
    return;
  }
  setStatus("Google Sheet에서 불러오는 중입니다...", "loading");
  try {
    const response = await fetch(`${endpoint}?action=load&ts=${Date.now()}`);
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || "불러오기 실패");
    applySheetPayload(data.payload);
    localStorage.setItem("retirementPlannerSheetEndpoint", endpoint);
    setStatus(`불러오기 완료: ${data.updatedAt || "최신값"}`, "ok");
  } catch (error) {
    setStatus(`불러오기 실패: ${error.message}`, "error");
  }
}

function saveLocal() {
  localStorage.setItem("retirementPlanner", JSON.stringify(state));
  document.getElementById("saveState").textContent = "저장됨";
  setTimeout(() => (document.getElementById("saveState").textContent = "저장"), 1200);
}

function loadLocal() {
  const stored = localStorage.getItem("retirementPlanner");
  if (!stored) return;
  const parsed = JSON.parse(stored);
  Object.assign(state.person, parsed.person || {});
  Object.assign(state.assumptions, parsed.assumptions || {});
  Object.assign(state.pensions, parsed.pensions || {});
  if (Array.isArray(parsed.accounts)) state.accounts = parsed.accounts;
  if (Array.isArray(parsed.scenarios)) state.scenarios = parsed.scenarios;
}

document.addEventListener("DOMContentLoaded", () => {
  loadLocal();
  updateInputs();
  document.getElementById("sheetEndpoint").value =
    localStorage.getItem("retirementPlannerSheetEndpoint") || "";
  document.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
  document.getElementById("saveState").addEventListener("click", saveLocal);
  document.getElementById("saveSheet").addEventListener("click", saveToSheet);
  document.getElementById("loadSheet").addEventListener("click", loadFromSheet);
  document.getElementById("resetState").addEventListener("click", () => {
    localStorage.removeItem("retirementPlanner");
    location.reload();
  });
  document.getElementById("copyMarkdown").addEventListener("click", async () => {
    await navigator.clipboard.writeText(document.getElementById("markdownPreview").value);
  });
  render();
});
