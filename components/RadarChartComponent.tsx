import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Scores } from '../types';

interface Props {
  scores: Scores;
}

const AXIS_LABELS: Record<string, string> = {
  Sleep: '수면',
  Digestion: '소화',
  Energy: '활력',
  Stress: '스트레스',
  Immunity: '면역',
};

const RadarChartComponent: React.FC<Props> = ({ scores }) => {
  const data = Object.entries(scores).map(([subject, A]) => ({
    subject: AXIS_LABELS[subject] || subject,
    A,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#475569', fontSize: 13, fontWeight: 600 }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="건강 점수"
            dataKey="A"
            stroke="#0d9488"
            strokeWidth={3}
            fill="#14b8a6"
            fillOpacity={0.5}
          />
          <Tooltip 
            formatter={(value: number) => [value, '점']}
            contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
            }}
            itemStyle={{ color: '#0f766e', fontWeight: 600 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarChartComponent;