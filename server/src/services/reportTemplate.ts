const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

const CATEGORY_LABELS: Record<string, string> = {
  Sleep: '수면 건강',
  Digestion: '소화 기능',
  Energy: '활력/에너지',
  Stress: '스트레스',
  Immunity: '면역력',
  Lifestyle: '생활 습관',
};

const toLocal = (value: string) => new Date(value).toLocaleString('ko-KR');

export const buildHtmlReport = (
  payload: {
    patientName: string;
    pharmacyName: string;
    createdAt: string;
    healthType: string;
    scores: Record<string, number>;
    recommendations?: Record<string, string>;
    followUps?: { nextVisitDate: string; status: string; checklist?: string[] }[];
    sessionToken?: string;
    brandColor?: string;
    brandLogoUrl?: string;
    brandTagline?: string;
  },
  type: 'patient' | 'pharmacist'
) => {
  const title = type === 'patient' ? '환자용 NRFT 리포트' : '약사용 NRFT 리포트';
  const accentColor = payload.brandColor ?? '#0f766e';
  const tint = accentColor.length === 7 ? `${accentColor}22` : accentColor;
  const recommendationHtml = payload.recommendations
    ? Object.entries(payload.recommendations)
        .map(
          ([key, value]) => `
        <li><strong>${escapeHtml(key)}</strong>: ${escapeHtml(value)}</li>`
        )
        .join('')
    : '<li>추천 정보가 없습니다.</li>';

  const followUpHtml =
    payload.followUps && payload.followUps.length
      ? payload.followUps
          .map(
            (fu) => `
        <li>
          <strong>${toLocal(fu.nextVisitDate)}</strong> (${escapeHtml(fu.status)}) ${
              fu.checklist?.length ? escapeHtml(fu.checklist.join(' · ')) : ''
            }
        </li>`
          )
          .join('')
      : '<li>등록된 F/U 일정이 없습니다.</li>';

  const scoreCards = Object.entries(payload.scores)
    .map(
      ([key, value]) => `
      <div class="score">
        <div class="score-label">${escapeHtml(CATEGORY_LABELS[key] ?? key)}</div>
        <div class="bar">
          <div class="fill" style="width: ${Math.round(value)}%"></div>
        </div>
        <div class="score-value">${Math.round(value)}%</div>
      </div>
    `
    )
    .join('');

  const focusAreas = Object.entries(payload.scores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(
      ([key, value]) => `<li>${escapeHtml(CATEGORY_LABELS[key] ?? key)} 영양/운동 변경점 ${
        Math.round(value)
      }% · 2주간 점검</li>`
    )
    .join('');

  const heroLogo = payload.brandLogoUrl
    ? `<img src="${escapeHtml(payload.brandLogoUrl)}" alt="${escapeHtml(payload.pharmacyName)} 로고" />`
    : `<div class="brand-mark">${escapeHtml(payload.pharmacyName)}</div>`;

  const taglineHtml = payload.brandTagline
    ? `<p class="tagline">${escapeHtml(payload.brandTagline)}</p>`
    : '';

  const sessionMeta =
    type === 'pharmacist'
      ? `<p class="report-meta">세션 토큰: ${escapeHtml(payload.sessionToken ?? '정보 없음')}</p>`
      : '';

  return `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      :root {
        --accent: ${accentColor};
        --accent-tint: ${tint};
        --text: #0f172a;
      }

      * {
        box-sizing: border-box;
      }

      body {
        font-family: 'Pretendard', 'Inter', sans-serif;
        background: #f5f7fb;
        margin: 0;
        color: var(--text);
      }

      .page {
        max-width: 840px;
        margin: 32px auto;
        padding: 32px;
      }

      .panel {
        background: #fff;
        border-radius: 32px;
        border: 1px solid #e2e8f0;
        padding: 32px;
        box-shadow: 0 20px 80px rgba(15, 23, 42, 0.08);
      }

      .report-header {
        background: linear-gradient(135deg, var(--accent), var(--accent-tint));
        border-radius: 28px;
        padding: 24px;
        color: #fff;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 16px;
        align-items: center;
      }

      .report-header h1 {
        margin: 0;
        font-size: 28px;
      }

      .report-meta {
        font-size: 14px;
        opacity: 0.9;
      }

      .score-grid {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .score {
        display: grid;
        grid-template-columns: 160px 1fr 60px;
        align-items: center;
        gap: 12px;
      }

      .score-label {
        font-weight: 600;
      }

      .bar {
        height: 10px;
        border-radius: 999px;
        background: #f1f5f9;
        overflow: hidden;
      }

      .fill {
        height: 100%;
        background: var(--accent);
        border-radius: 999px;
      }

      .score-value {
        font-weight: 600;
        font-size: 12px;
      }

      section {
        margin-top: 32px;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 18px;
        font-weight: 700;
      }

      .list-card {
        background: #f8fafc;
        border-radius: 18px;
        padding: 16px 20px;
        border: 1px solid #e2e8f0;
      }

      ul {
        margin: 0;
        padding-left: 18px;
        color: #0f172a;
        line-height: 1.75;
      }

      .hero-logo img {
        height: 48px;
        object-fit: contain;
      }

      .brand-mark {
        font-weight: 700;
        font-size: 20px;
      }

      .tagline {
        margin: 8px 0 0;
        font-size: 13px;
        opacity: 0.85;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="panel">
        <div class="report-header">
          <div class="hero-logo">
            ${heroLogo}
          </div>
          <div>
            <h1>${title}</h1>
            <p class="report-meta">${escapeHtml(payload.patientName)} · ${escapeHtml(
              payload.pharmacyName
            )} · ${toLocal(payload.createdAt)}</p>
            ${taglineHtml}
            ${sessionMeta}
          </div>
        </div>

        <section>
          <h2>NRFT 점수</h2>
          <div class="score-grid">
            ${scoreCards}
          </div>
        </section>

        <section>
          <h2>건강 타입</h2>
          <p>${escapeHtml(payload.healthType)}</p>
        </section>

        <section>
          <h2>맞춤 제안</h2>
          <div class="list-card">
            <ul>
              ${recommendationHtml}
            </ul>
          </div>
        </section>

        <section>
          <h2>${type === 'patient' ? '관리 팁' : '중점 체크 영역'}</h2>
          <div class="list-card">
            <ul>
              ${focusAreas || '<li>모든 영역을 고르게 유지하세요.</li>'}
            </ul>
          </div>
        </section>

        <section>
          <h2>Follow-up 일정</h2>
          <div class="list-card">
            <ul>
              ${followUpHtml}
            </ul>
          </div>
        </section>
      </div>
    </div>
  </body>
</html>
`;
};
