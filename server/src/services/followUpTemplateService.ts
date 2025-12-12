import prisma from '../prisma/client';
import { FollowUpStatus } from '@prisma/client';

const defaults: Record<string, { checklist: string[]; offsetDays: number }> = {
  '에너지 고갈형 (Burnout Fire)': {
    checklist: ['수면시간 기록', '카페인/운동 루틴 점검'],
    offsetDays: 7,
  },
  '수면 부족형 (Restless Owl)': {
    checklist: ['취침 전 루틴 점검', '수면일지 확인'],
    offsetDays: 7,
  },
  '소화 민감형 (Sensitive Stomach)': {
    checklist: ['식사일지 리뷰', '프로바이오틱스 복용 체크'],
    offsetDays: 10,
  },
  '스트레스 과다형 (Tension Wire)': {
    checklist: ['호흡/명상 실천 여부', '카페인 제한 확인'],
    offsetDays: 7,
  },
  '면역 저하형 (Delicate Shield)': {
    checklist: ['비타민C/D 복용', '수면·수분 확보'],
    offsetDays: 7,
  },
};

export const createAutoFollowUp = async (assessmentId: string, healthType: string) => {
  const template =
    (await prisma.followUpTemplate.findFirst({ where: { healthType } })) ??
    defaults[healthType];

  if (!template) return null;

  const offset = 'offsetDays' in template ? template.offsetDays : 7;
  const checklist = 'checklistJson' in template ? template.checklistJson : template.checklist;
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + offset);

  return prisma.followUp.create({
    data: {
      assessmentId,
      nextVisitDate: nextDate,
      checklistJson: checklist ?? [],
      status: FollowUpStatus.SCHEDULED,
    },
  });
};
