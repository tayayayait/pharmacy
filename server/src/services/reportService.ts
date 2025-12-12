import { Response } from 'express';
import PDFDocument from 'pdfkit';

const formatDateTime = (value?: string | null) => {
  if (!value) return '정보 없음';
  return new Date(value).toLocaleString('ko-KR');
};

export const streamAssessmentReport = (
  res: Response,
  payload: {
    assessmentId: string;
    patientName: string;
    healthType: string;
    scores: Record<string, number>;
    recommendations?: Record<string, string>;
    createdAt: string;
    pharmacyName: string;
    sessionToken?: string;
    followUps?: { nextVisitDate: string; status: string; checklist?: string[] }[];
    reportType?: 'patient' | 'pharmacist';
    brandColor?: string;
    brandLogoUrl?: string;
    brandTagline?: string;
  }
) => {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="assessment-report-${payload.assessmentId}-${payload.reportType ?? 'pharmacist'}.pdf"`
  );
  doc.pipe(res);

  const accentColor = payload.brandColor ?? '#0f766e';
  const headerHeight = 110;

  doc.save();
  doc.rect(0, 0, doc.page.width, headerHeight).fill(accentColor);
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(`NRFT ${payload.reportType === 'patient' ? '환자용' : '약사용'} 리포트`, 0, 30, {
      align: 'center',
    });
  doc
    .font('Helvetica')
    .fontSize(11)
    .text(`${payload.patientName} · ${payload.pharmacyName}`, 0, 60, { align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(formatDateTime(payload.createdAt), 0, 75, { align: 'center' });
  if (payload.brandTagline) {
    doc.font('Helvetica-Oblique').fontSize(10).text(payload.brandTagline, 0, 90, { align: 'center' });
  }
  doc.restore();

  doc.moveDown(6);
  doc.fillColor('#0f172a');

  doc.font('Helvetica-Bold').fontSize(16).text(`${payload.patientName}님의 NRFT 분석`, { underline: true });
  doc.moveDown(0.5);

  Object.entries(payload.scores).forEach(([label, value]) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`${label}`, { continued: true })
      .font('Helvetica')
      .text(` : ${Math.round(value)}%`, { align: 'right' });
  });

  doc.moveDown();
  doc
    .font('Helvetica-Bold')
    .text('건강 타입', { continued: true })
    .font('Helvetica')
    .text(`: ${payload.healthType}`);

  if (payload.recommendations) {
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(13).text('맞춤 제안', { underline: true });
    Object.entries(payload.recommendations).forEach(([key, value]) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`${key}`, { continued: true })
        .font('Helvetica')
        .text(`: ${value}`);
    });
  }

  if (payload.followUps && payload.followUps.length > 0) {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).text('F/U 일정', { underline: true });
    doc.moveDown(0.5);
    payload.followUps.forEach((item, index) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(`${index + 1}. ${formatDateTime(item.nextVisitDate)} (${item.status})`);
      if (item.checklist?.length) {
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(`체크리스트: ${item.checklist.join(' · ')}`)
          .moveDown(0.5);
      }
    });
  }

  if (payload.reportType === 'patient') {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).text('다음 단계', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11).text('- 2주간 생활요법을 실천하고 변화 추이를 기록합니다.');
    doc.font('Helvetica').fontSize(11).text('- 변화가 없다면 약사에게 상담 예약을 요청해 주세요.');
  } else {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).text('세션 요약', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11).text(`세션 토큰: ${payload.sessionToken ?? '정보 없음'}`);
    doc.font('Helvetica').fontSize(11).text('- 위 내용을 환자에게 공유하고 Follow-up을 계획하세요.');
  }

  doc.end();
};
