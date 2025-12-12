export type Axis = 'Sleep' | 'Digestion' | 'Energy' | 'Stress' | 'Immunity';

export interface Scores {
  Sleep: number;
  Digestion: number;
  Energy: number;
  Stress: number;
  Immunity: number;
}

export interface MatrixScores extends Scores {
  Defense?: number;
  EnergySystem?: number;
  Transport?: number;
  Communication?: number;
  LifestyleSleep?: number;
  LifestyleNutrition?: number;
  LifestyleStress?: number;
  LifestyleMovement?: number;
}

const INITIAL_SCORES: Scores = {
  Sleep: 100,
  Digestion: 100,
  Energy: 100,
  Stress: 100,
  Immunity: 100,
};

const HEALTH_TYPES = [
  { name: '에너지 고갈형 (Burnout Fire)', triggerAxis: 'Energy' as Axis },
  { name: '수면 부족형 (Restless Owl)', triggerAxis: 'Sleep' as Axis },
  { name: '소화 민감형 (Sensitive Stomach)', triggerAxis: 'Digestion' as Axis },
  { name: '스트레스 과다형 (Tension Wire)', triggerAxis: 'Stress' as Axis },
  { name: '면역 저하형 (Delicate Shield)', triggerAxis: 'Immunity' as Axis },
];

const RECOMMENDATION_MAP: Record<string, { lifestyle: string; product: string; message: string }> = {
  '에너지 고갈형 (Burnout Fire)': {
    lifestyle: '짧은 휴식(5분) × 4회, 오전 산책으로 부신 리듬 활성화',
    product: 'B-콤플렉스 + 비타민C 복합제',
    message: '지치고 무기력한 상태이니 작은 루틴을 쌓아 회복 속도를 높입니다.',
  },
  '수면 부족형 (Restless Owl)': {
    lifestyle: '수면 위생(자기 전 화면 금지, 블루라이트 차단)',
    product: '마그네슘+GABA 복합제',
    message: '수면 패턴을 재정비하면 다음날 컨디션이 30% 이상 개선됩니다.',
  },
  '소화 민감형 (Sensitive Stomach)': {
    lifestyle: '식사 20분 이상 천천히, 야채 중심 식단',
    product: '프리/프로바이오틱스 + 소화효소',
    message: '소화가 정상화되어야 전신 에너지 흐름도 회복됩니다.',
  },
  '스트레스 과다형 (Tension Wire)': {
    lifestyle: '깊은 호흡 2회, 점심 직후 짧은 산책',
    product: '아답토젠 + L-테아닌',
    message: '스트레스를 문진하며 풀어내면 몸 전체 긴장이 완화됩니다.',
  },
  '면역 저하형 (Delicate Shield)': {
    lifestyle: '철저한 수면/수분+손 위생, 휴식 중심 데일리 루틴',
    product: '비타민C/D + 아연 분말',
    message: '면역 보강이 최우선이며, 과로/과음은 잠시 멈춰야 합니다.',
  },
};

export interface NRFTAnalysisResult {
  scores: Scores;
  healthType: string;
  focusAxes: { axis: Axis; score: number }[];
  clusters: Record<string, number>;
  recommendations: {
    lifestyle: string;
    product: string;
    message: string;
  };
}

export const calculateScores = (
  selectedOptionIds: string[],
  optionImpacts: Record<string, Partial<MatrixScores>>
): MatrixScores => {
  const result: MatrixScores = { ...INITIAL_SCORES };

  selectedOptionIds.forEach((id) => {
    const impact = optionImpacts[id];
    if (!impact) return;

    Object.entries(impact).forEach(([key, value]) => {
      const axis = key as keyof MatrixScores;
      if (value !== undefined && result[axis] !== undefined) {
        // 기본 축
        // @ts-ignore
        result[axis] = Math.max(0, Math.min(100, (result[axis] as number) + value));
      } else {
        // 확장 매트릭스는 그대로 누적
        result[axis] = Math.max(0, Math.min(100, (result[axis] ?? 100) + (value ?? 0)));
      }
    });
  });

  return result;
};

export const determineHealthType = (scores: Scores): string => {
  const entries = Object.entries(scores) as [Axis, number][];
  const lowest = entries.reduce((prev, curr) => (curr[1] < prev[1] ? curr : prev), entries[0]);
  const matched = HEALTH_TYPES.find((type) => type.triggerAxis === lowest[0]);
  return matched ? matched.name : 'Balanced Harmony';
};

const buildClusters = (scores: Scores): Record<string, number> => {
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  return {
    innerBalance: Math.round(total / Object.keys(scores).length),
    energy: scores.Energy,
    resilience: Math.round(Math.min(scores.Immunity, scores.Stress)),
    digestion: scores.Digestion,
    rest: scores.Sleep,
  };
};

const buildRecommendations = (healthType: string) => {
  return RECOMMENDATION_MAP[healthType] ?? {
    lifestyle: '일상에서 작은 루틴부터 시작하세요.',
    product: '기초 영양제(멀티비타민/종합오메가) 추천',
    message: '전반적으로 균형을 잡으면 회복 속도가 빨라집니다.',
  };
};

export const analyzeNRFT = (
  selectedOptionIds: string[],
  optionImpacts: Record<string, Partial<Scores>>
): NRFTAnalysisResult => {
  const scores = calculateScores(selectedOptionIds, optionImpacts);
  const healthType = determineHealthType(scores);
  const focusAxes = (Object.entries(scores) as [Axis, number][])
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([axis, score]) => ({ axis, score }));

  return {
    scores,
    healthType,
    focusAxes,
    clusters: buildClusters(scores),
    recommendations: buildRecommendations(healthType),
  };
};
