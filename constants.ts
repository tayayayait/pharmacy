import { Axis, HealthTypeDefinition, Question, Scores } from './types';

export const INITIAL_SCORES: Scores = {
  Sleep: 100,
  Digestion: 100,
  Energy: 100,
  Stress: 100,
  Immunity: 100,
};

export const HEALTH_TYPES: HealthTypeDefinition[] = [
  {
    name: '에너지 고갈형 (Burnout Fire)',
    description: '체내 에너지 비축량이 바닥났습니다. 부신 기능 강화와 충분한 휴식이 시급합니다.',
    color: '#ef4444', // Red
    triggerAxis: 'Energy',
  },
  {
    name: '수면 부족형 (Restless Owl)',
    description: '생체 리듬이 깨져있습니다. 마그네슘 섭취와 수면 위생 개선이 필요합니다.',
    color: '#8b5cf6', // Violet
    triggerAxis: 'Sleep',
  },
  {
    name: '소화 민감형 (Sensitive Stomach)',
    description: '장내 미생물 균형이 불안정합니다. 유산균과 효소 섭취를 권장합니다.',
    color: '#f59e0b', // Amber
    triggerAxis: 'Digestion',
  },
  {
    name: '스트레스 과다형 (Tension Wire)',
    description: '코르티솔 수치가 높습니다. 긴장을 완화하는 테아닌이나 아답토젠이 도움됩니다.',
    color: '#ec4899', // Pink
    triggerAxis: 'Stress',
  },
  {
    name: '면역 저하형 (Delicate Shield)',
    description: '방어 체계가 약해졌습니다. 아연, 비타민C/D로 기초 면역을 채워야 합니다.',
    color: '#10b981', // Emerald
    triggerAxis: 'Immunity',
  },
];

export const SURVEY_QUESTIONS: Question[] = [
  {
    id: 'q_sleep_1',
    category: 'Sleep',
    text: '요즘 수면의 질은 어떠신가요?',
    type: 'multiple',
    options: [
      { id: 's1_a', text: '잠드는 데 시간이 오래 걸린다 (30분 이상)', impact: { Sleep: -15, Stress: -5 } },
      { id: 's1_b', text: '자다가 자주 깨거나 깊게 못 잔다', impact: { Sleep: -15, Energy: -5 } },
      { id: 's1_c', text: '자고 일어나도 개운하지 않다', impact: { Sleep: -10, Energy: -10 } },
    ],
  },
  {
    id: 'q_digestion_1',
    category: 'Digestion',
    text: '소화 기관에 불편함이 있으신가요?',
    type: 'multiple',
    options: [
      { id: 'd1_a', text: '식사 후 속이 더부룩하거나 가스가 찬다', impact: { Digestion: -15 } },
      { id: 'd1_b', text: '속쓰림이 있거나 신물이 올라온다', impact: { Digestion: -15, Stress: -5 } },
      { id: 'd1_c', text: '배변이 불규칙하다 (설사 또는 변비)', impact: { Digestion: -10, Immunity: -5 } },
    ],
  },
  {
    id: 'q_lifestyle_1',
    category: 'Lifestyle',
    text: '해당하는 생활 습관을 선택해주세요.',
    type: 'multiple',
    options: [
      { id: 'l1_a', text: '흡연을 한다', impact: { Immunity: -20, Energy: -10 } },
      { id: 'l1_b', text: '일주일에 2회 이상 술을 마신다', impact: { Digestion: -10, Sleep: -10 } },
      { id: 'l1_c', text: '운동을 거의 하지 않는다', impact: { Energy: -10, Stress: -5 } },
    ],
  },
  {
    id: 'q_stress_1',
    category: 'Stress',
    text: '평소 스트레스를 얼마나 받으시나요?',
    type: 'single',
    options: [
      { id: 'st1_a', text: '거의 받지 않는다', impact: {} },
      { id: 'st1_b', text: '가끔 받는다 (주 1-2회)', impact: { Stress: -10 } },
      { id: 'st1_c', text: '자주 받는다 (거의 매일)', impact: { Stress: -25, Sleep: -10 } },
    ],
  },
];