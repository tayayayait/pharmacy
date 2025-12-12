import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

export interface GeminiContext {
  patientName: string;
  ageGroup: string;
  gender: string;
  scores: Record<string, number>;
  healthType: string;
}

export const generateConsultationScript = async (context: GeminiContext): Promise<string> => {
  if (!env.geminiApiKey) {
    throw new Error('Gemini API key is not configured');
  }

  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

  const prompt = `
당신은 전문적이고 공감 능력이 뛰어난 약사 보조 AI입니다.
아래 환자 정보를 바탕으로 약사가 환자에게 직접 읽어주거나 참고할 수 있는
전문 상담 스크립트(150자 내외)를 한국어로 작성해주세요.

[환자 정보]
- 이름/닉네임: ${context.patientName}
- 연령대: ${context.ageGroup}
- 성별: ${context.gender}

[NRFT 건강 점수 (0-100)]
- 수면: ${context.scores.Sleep}
- 소화: ${context.scores.Digestion}
- 활력: ${context.scores.Energy}
- 스트레스: ${context.scores.Stress}
- 면역: ${context.scores.Immunity}

[분석된 건강 타입]
${context.healthType}

[작성 가이드]
1. 가장 점수가 낮은 1~2개 항목에 집중하여 설명하세요.
2. 환자의 불편함에 공감하며 시작하세요.
3. 구체적인 생활 습관 교정 1가지와 영양소 및 추천 제품 1가지를 추천하세요.
4. 의료적 진단(병명 확정)은 피하고, 건강 관리를 위한 조언 어조를 유지하세요.
5. "약사"가 "환자"에게 말하는 존댓말 구어체로 작성하세요.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text?.trim() ?? 'AI 상담 스크립트를 생성할 수 없습니다.';
};

