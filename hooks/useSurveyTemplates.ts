import { useEffect, useState } from 'react';
import type { SurveyTemplateSummary } from '../types';
import { fetchSurveyTemplates } from '../services/apiClient';

export const useSurveyTemplates = () => {
  const [templates, setTemplates] = useState<SurveyTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchSurveyTemplates();
        if (!canceled) {
          setTemplates(Array.isArray(payload) ? payload : []);
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : '설문 템플릿을 불러오지 못했습니다.');
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      canceled = true;
    };
  }, []);

  return { templates, loading, error };
};
