import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import type { Assessment, AssessmentStatus, PatientInfo } from '../types';
import { fetchAssessments, patchAssessmentStatus } from '../services/apiClient';

const deriveAgeGroup = (birthYear?: number | null): PatientInfo['ageGroup'] => {
  if (!birthYear) return '정보 없음';
  const age = new Date().getFullYear() - birthYear;
  if (age < 20) return '10대';
  if (age < 30) return '20대';
  if (age < 40) return '30대';
  if (age < 50) return '40대';
  if (age < 60) return '50대';
  return '60대 이상';
};

const mapPatient = (patient: any): PatientInfo => ({
  id: patient.id,
  nickname: patient.nickname ?? patient.displayName ?? '환자',
  ageGroup: patient.ageGroup ?? deriveAgeGroup(patient.birthYear),
  gender: (patient.gender ?? 'other') as PatientInfo['gender'],
  phoneLast4: patient.phoneLast4 ?? '0000',
});

const mapAssessment = (payload: any): Assessment => ({
  id: payload.id,
  pharmacyId: payload.pharmacyId,
  status: (payload.status ?? 'PENDING').toLowerCase() as AssessmentStatus,
  healthType: payload.healthType,
  scores: payload.scores ?? {
    Sleep: 100,
    Digestion: 100,
    Energy: 100,
    Stress: 100,
    Immunity: 100,
  },
  clusters: payload.clustersJson,
  recommendations: payload.recommendationsJson,
  selectedOptionIds: payload.selectedOptionIds ?? [],
  aiConsultationNote: payload.aiScript,
  createdAt: payload.createdAt,
  patient: payload.patient
    ? {
        ...mapPatient(payload.patient),
      }
    : undefined,
});

export const useAssessments = () => {
  const { isAuthenticated } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAssessments = useCallback(async () => {
    if (!isAuthenticated) {
      setAssessments([]);
      return;
    }

    setLoading(true);
    try {
      const payload = (await fetchAssessments()) ?? [];
      const records = Array.isArray(payload) ? payload : [];
      setAssessments(records.map((item) => mapAssessment(item)));
    } catch (error) {
      console.error('Failed to load assessments', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const updateAssessmentStatus = useCallback(
    async (id: string, status: AssessmentStatus) => {
      const updated = await patchAssessmentStatus(id, status.toUpperCase() as 'PENDING' | 'COMPLETED');
      setAssessments((prev) =>
        prev.map((assessment) => (assessment.id === id ? mapAssessment(updated) : assessment))
      );
    },
    []
  );

  const updateAssessmentNote = useCallback((id: string, note: string) => {
    setAssessments((prev) =>
      prev.map((assessment) => (assessment.id === id ? { ...assessment, aiConsultationNote: note } : assessment))
    );
  }, []);

  const refresh = useCallback(() => {
    loadAssessments();
  }, [loadAssessments]);

  return useMemo(
    () => ({
      assessments,
      loading,
      refresh,
      updateAssessmentStatus,
      updateAssessmentNote,
    }),
    [assessments, loading, refresh, updateAssessmentNote, updateAssessmentStatus]
  );
};
