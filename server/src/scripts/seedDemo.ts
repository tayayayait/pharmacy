import prisma from '../prisma/client';
import { encryptString } from '../utils/crypto';

const TEMPLATE_NAME = 'NRFT 초기 건강 문진';
const DEMO_SESSION_TOKEN = 'demo-nrft-session';

const questionSeed = [
  {
    category: 'Sleep',
    text: '지난 한 달간 수면의 질은 어떤가요?',
    type: 'MULTIPLE',
    options: [
      { text: '잠들기까지 30분 이상 걸린다', impact: { Sleep: -15, Stress: -5 } },
      { text: '밤새 뒤척이거나 자주 깨는 편이다', impact: { Sleep: -15, Energy: -5 } },
      { text: '아침에 개운하지 않고 피곤하다', impact: { Sleep: -10, Energy: -10 } },
    ],
  },
  {
    category: 'Digestion',
    text: '식사 후 소화나 위장이 불편한가요?',
    type: 'MULTIPLE',
    options: [
      { text: '속이 더부룩하고 가스가 찬다', impact: { Digestion: -15 } },
      { text: '속쓰림이나 신물이 올라온다', impact: { Digestion: -15, Stress: -5 } },
      { text: '배변이 불규칙하거나 혈변이 있다', impact: { Digestion: -10, Immunity: -5 } },
    ],
  },
  {
    category: 'Energy',
    text: '최근 활력이 떨어졌다고 느끼시나요?',
    type: 'SINGLE',
    options: [
      { text: '항상 활기차다', impact: {} },
      { text: '종일 가끔 무기력하다', impact: { Energy: -10 } },
      { text: '거의 매일 기력이 없고 쉬어야 한다', impact: { Energy: -25, Sleep: -5 } },
    ],
  },
  {
    category: 'Stress',
    text: '업무/생활 스트레스 수준은 어느 정도인가요?',
    type: 'SINGLE',
    options: [
      { text: '거의 스트레스 받지 않는다', impact: {} },
      { text: '때때로 스트레스를 느낀다', impact: { Stress: -10 } },
      { text: '늘 긴장되어 있다', impact: { Stress: -25, Sleep: -10 } },
    ],
  },
  {
    category: 'Lifestyle',
    text: '현재 생활 습관 중 해당되는 항목을 선택하세요.',
    type: 'MULTIPLE',
    options: [
      { text: '주 3회 이상 운동하지만 강도가 높지 않다', impact: { Energy: +5 } },
      { text: '흡연을 한다', impact: { Immunity: -20, Energy: -10 } },
      { text: '수면 시간이 부족하여 오전에 커피를 많이 마신다', impact: { Sleep: -10, Stress: -5 } },
    ],
  },
  {
    category: 'Medication',
    text: '현재 복용 중인 약/영양제는 있나요?',
    type: 'MULTIPLE',
    options: [
      { text: '정기 복용 중인 처방약이 있다', impact: { Stress: -5 } },
      { text: '비타민/영양제를 꾸준히 복용한다', impact: { Immunity: +5 } },
      { text: '특별한 약은 없다', impact: {} },
    ],
  },
];

const patientSeed = {
  name: '홍길동',
  phone: '01012345678',
  displayName: '홍길동',
  gender: 'male',
  birthYear: 1991,
};

const main = async () => {
  const pharmacy = await prisma.pharmacy.findFirst({
    where: { name: 'Demo Pharmacy' },
  });
  if (!pharmacy) {
    throw new Error('Demo Pharmacy를 찾을 수 없습니다. /auth/seed-dev 를 먼저 실행하세요.');
  }

  await prisma.surveyTemplate.deleteMany({ where: { name: TEMPLATE_NAME } });
  const template = await prisma.surveyTemplate.create({
    data: {
      name: TEMPLATE_NAME,
      description: 'NRFT 8대 영역을 기반으로 한 초기 건강 문진표입니다.',
      type: 'INITIAL',
      isActive: true,
      questions: {
        create: questionSeed.map((question, qIdx) => ({
          order: qIdx + 1,
          category: question.category,
          text: question.text,
          type: question.type,
          options: {
            create: question.options.map((option, oIdx) => ({
              order: oIdx + 1,
              text: option.text,
              impactJson: option.impact ?? {},
            })),
          },
        })),
      },
    },
  });

  const existingPatient = await prisma.patient.findFirst({
    where: {
      pharmacyId: pharmacy.id,
      displayName: patientSeed.displayName,
    },
  });

  const patient = existingPatient
    ? existingPatient
    : await prisma.patient.create({
        data: {
          encryptedName: encryptString(patientSeed.name),
          encryptedPhone: encryptString(patientSeed.phone),
          displayName: patientSeed.displayName,
          phoneLast4: patientSeed.phone.slice(-4),
          gender: patientSeed.gender,
          birthYear: patientSeed.birthYear,
          pharmacyId: pharmacy.id,
        },
      });

  await prisma.surveySession.deleteMany({
    where: {
      token: DEMO_SESSION_TOKEN,
    },
  });

  const session = await prisma.surveySession.create({
    data: {
      token: DEMO_SESSION_TOKEN,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      templateId: template.id,
      patientId: patient.id,
      pharmacyId: pharmacy.id,
    },
  });

  console.log('✅ 샘플 설문 템플릿, 환자, 세션이 준비되었습니다.');
  console.log(`  - Template ID: ${template.id}`);
  console.log(`  - Patient ID: ${patient.id}`);
  console.log(`  - Session Token: ${session.token}`);
};

main()
  .catch((error) => {
    console.error('시드 실행 실패:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
