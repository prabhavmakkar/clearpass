import type { KnowledgeNode } from './types'

export const CA_INTER_AUDIT_NODES: KnowledgeNode[] = [
  { id: 'audit-ch01', title: 'Nature, Objective and Scope of Audit',            category: 'foundation',  examWeightPercent: 8,  icaiChapter: 1  },
  { id: 'audit-ch02', title: 'Audit Strategy, Planning and Programme',           category: 'procedures',  examWeightPercent: 10, icaiChapter: 2  },
  { id: 'audit-ch03', title: 'Audit Documentation and Audit Evidence',           category: 'procedures',  examWeightPercent: 10, icaiChapter: 3  },
  { id: 'audit-ch04', title: 'Risk Assessment and Internal Control',             category: 'risk',        examWeightPercent: 14, icaiChapter: 4  },
  { id: 'audit-ch05', title: 'Fraud and Responsibilities of the Auditor',        category: 'risk',        examWeightPercent: 7,  icaiChapter: 5  },
  { id: 'audit-ch06', title: 'Audit in an Automated Environment',                category: 'specialised', examWeightPercent: 8,  icaiChapter: 6  },
  { id: 'audit-ch07', title: 'Audit Sampling',                                   category: 'procedures',  examWeightPercent: 7,  icaiChapter: 7  },
  { id: 'audit-ch08', title: 'Analytical Procedures',                            category: 'procedures',  examWeightPercent: 6,  icaiChapter: 8  },
  { id: 'audit-ch09', title: 'Audit of Items of Financial Statements',           category: 'procedures',  examWeightPercent: 12, icaiChapter: 9  },
  { id: 'audit-ch10', title: 'The Company Audit',                                category: 'reporting',   examWeightPercent: 10, icaiChapter: 10 },
  { id: 'audit-ch11', title: 'Audit Report',                                     category: 'reporting',   examWeightPercent: 10, icaiChapter: 11 },
  { id: 'audit-ch12', title: 'Audit of Banks',                                   category: 'specialised', examWeightPercent: 8,  icaiChapter: 12 },
]

export const TOPIC_MAP: Record<string, KnowledgeNode[]> = {
  'ca-inter-audit': CA_INTER_AUDIT_NODES,
}

export function getNodes(topic: string): KnowledgeNode[] {
  return TOPIC_MAP[topic] ?? []
}

export function getNodeById(topic: string, id: string): KnowledgeNode | undefined {
  return getNodes(topic).find(n => n.id === id)
}
