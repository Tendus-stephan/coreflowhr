
import React from 'react';

export interface SlideIssue {
    issue: string;
    solution: string;
}

export interface Slide {
    id: number;
    title: string;
    subtitle: string;
    content: string;
    detailedSteps: string[];
    commonIssues: SlideIssue[];
    tips: string[];
    icon: React.ReactNode;
    accentColor: string;
    visualLabel: string;
}
