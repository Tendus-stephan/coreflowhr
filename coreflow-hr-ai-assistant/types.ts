
import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  trend: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  match: number;
  status: 'New' | 'Screening' | 'Interview' | 'Offer';
}

export interface RecruitmentData {
  date: string;
  count: number;
}
