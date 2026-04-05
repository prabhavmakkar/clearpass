import type { Question } from './types'

// Seed bank: 2 questions per chapter (24 total). IDs: bank-chXX-NNN
export const QUESTION_BANK: Question[] = [

  // ── Chapter 1: Nature, Objective and Scope ───────────────────────────
  {
    id: 'bank-ch01-001', nodeId: 'audit-ch01', difficulty: 'easy', source: 'bank',
    stem: 'The primary objective of an audit of financial statements is to:',
    options: [
      'Detect all frauds and errors in the financial statements',
      'Express an opinion on whether the financial statements give a true and fair view',
      'Certify the accuracy of every transaction recorded in the books',
      'Prepare financial statements on behalf of management',
    ],
    correctIndex: 1,
    explanation: 'SA 200 defines the auditor\'s objective as expressing an opinion on whether the financial statements are prepared, in all material respects, in accordance with the applicable financial reporting framework.',
    icaiReference: 'SA 200, Para 11',
  },
  {
    id: 'bank-ch01-002', nodeId: 'audit-ch01', difficulty: 'medium', source: 'bank',
    stem: 'Which of the following best describes "professional scepticism" as defined in SA 200?',
    options: [
      'Assuming that management is dishonest in all circumstances',
      'An attitude that includes a questioning mind and critical assessment of audit evidence',
      'Verifying every transaction without regard to materiality',
      'Relying solely on prior-year audit findings for current-year conclusions',
    ],
    correctIndex: 1,
    explanation: 'Professional scepticism involves a questioning mind, being alert to conditions indicating possible misstatement, and critical assessment of evidence — not blanket distrust of management.',
    icaiReference: 'SA 200, Para 13(l)',
  },

  // ── Chapter 2: Planning ──────────────────────────────────────────────
  {
    id: 'bank-ch02-001', nodeId: 'audit-ch02', difficulty: 'easy', source: 'bank',
    stem: 'An audit programme is best described as:',
    options: [
      'A letter sent to the client outlining audit fees',
      'A set of instructions for the audit team detailing the nature, timing, and extent of audit procedures',
      'A summary of the auditor\'s final report',
      'The schedule of meetings between the auditor and management',
    ],
    correctIndex: 1,
    explanation: 'An audit programme documents the planned audit procedures, providing instructions to the team on what to do, when, and to what extent.',
  },
  {
    id: 'bank-ch02-002', nodeId: 'audit-ch02', difficulty: 'medium', source: 'bank',
    stem: 'Overall audit strategy differs from the audit plan in that the overall strategy:',
    options: [
      'Contains detailed procedures for each account balance',
      'Sets the scope, timing, and direction and guides the development of the audit plan',
      'Is prepared after the completion of fieldwork',
      'Is restricted to the assessment of internal controls',
    ],
    correctIndex: 1,
    explanation: 'SA 300 distinguishes the overall audit strategy (high-level direction) from the audit plan (detailed procedures). The strategy is set first and guides the plan.',
    icaiReference: 'SA 300',
  },

  // ── Chapter 3: Documentation & Evidence ─────────────────────────────
  {
    id: 'bank-ch03-001', nodeId: 'audit-ch03', difficulty: 'easy', source: 'bank',
    stem: 'Which of the following is NOT a characteristic of sufficient appropriate audit evidence?',
    options: [
      'It is relevant to the assertion being tested',
      'It is reliable depending on its source and nature',
      'It is prepared by the auditor directly',
      'It provides a basis for the auditor\'s conclusions',
    ],
    correctIndex: 2,
    explanation: '"Sufficiency" and "appropriateness" relate to quantity and quality. Audit evidence need not be prepared by the auditor — it includes third-party confirmations and physical inspection.',
    icaiReference: 'SA 500',
  },
  {
    id: 'bank-ch03-002', nodeId: 'audit-ch03', difficulty: 'medium', source: 'bank',
    stem: 'Audit documentation must be retained for a minimum of how many years after the date of the auditor\'s report, as per ICAI guidelines?',
    options: ['3 years', '5 years', '7 years', '10 years'],
    correctIndex: 2,
    explanation: 'ICAI standards require retention of audit documentation for at least 7 years from the date of the auditor\'s report.',
    icaiReference: 'SA 230, SQC 1',
  },

  // ── Chapter 4: Risk Assessment & Internal Control ────────────────────
  {
    id: 'bank-ch04-001', nodeId: 'audit-ch04', difficulty: 'medium', source: 'bank',
    stem: 'Inherent risk is best defined as:',
    options: [
      'The risk that a material misstatement will not be prevented or detected by internal controls',
      'The susceptibility of an assertion to a material misstatement before considering any related controls',
      'The risk that the auditor\'s procedures will not detect a material misstatement',
      'The risk arising from the auditor issuing an incorrect opinion',
    ],
    correctIndex: 1,
    explanation: 'Inherent risk is the susceptibility of an assertion to misstatement — assuming no related internal controls exist.',
    icaiReference: 'SA 315',
  },
  {
    id: 'bank-ch04-002', nodeId: 'audit-ch04', difficulty: 'hard', source: 'bank',
    stem: 'Which COSO component is primarily concerned with the organisational structure and assignment of authority and responsibility?',
    options: ['Control Activities', 'Control Environment', 'Risk Assessment', 'Monitoring Activities'],
    correctIndex: 1,
    explanation: 'The Control Environment sets the tone of the organisation and includes governance, management philosophy, and assignment of authority.',
  },

  // ── Chapter 5: Fraud ─────────────────────────────────────────────────
  {
    id: 'bank-ch05-001', nodeId: 'audit-ch05', difficulty: 'easy', source: 'bank',
    stem: 'According to SA 240, responsibility for the prevention and detection of fraud rests primarily with:',
    options: [
      'The external auditor',
      'The internal auditor',
      'Those charged with governance and management',
      'Regulatory authorities',
    ],
    correctIndex: 2,
    explanation: 'SA 240 is explicit: primary responsibility for fraud prevention and detection lies with those charged with governance and management.',
    icaiReference: 'SA 240, Para 4',
  },
  {
    id: 'bank-ch05-002', nodeId: 'audit-ch05', difficulty: 'medium', source: 'bank',
    stem: 'The "fraud triangle" consists of:',
    options: [
      'Motive, Opportunity, and Rationalisation',
      'Intent, Capability, and Concealment',
      'Greed, Weakness, and Pressure',
      'Risk, Control, and Detection',
    ],
    correctIndex: 0,
    explanation: 'The fraud triangle identifies three conditions: pressure/motive, opportunity, and rationalisation.',
  },

  // ── Chapter 6: Automated Environment ────────────────────────────────
  {
    id: 'bank-ch06-001', nodeId: 'audit-ch06', difficulty: 'medium', source: 'bank',
    stem: 'General IT controls (GITCs) are distinguished from application controls in that GITCs:',
    options: [
      'Apply to a single application or transaction type',
      'Operate across all IT systems and applications in the organisation',
      'Are implemented by end-users rather than IT staff',
      'Only relate to data entry validation',
    ],
    correctIndex: 1,
    explanation: 'GITCs pervasively affect all applications. Application controls are specific to individual systems or processes.',
  },
  {
    id: 'bank-ch06-002', nodeId: 'audit-ch06', difficulty: 'hard', source: 'bank',
    stem: 'In an IT environment, which of the following represents the GREATEST risk to data integrity?',
    options: [
      'Lack of physical security for servers',
      'Inadequate IT change management procedures',
      'Slow internet connectivity',
      'Use of cloud storage instead of on-premises servers',
    ],
    correctIndex: 1,
    explanation: 'Poor change management means unauthorised or untested changes can be deployed to production systems, directly threatening data integrity.',
  },

  // ── Chapter 7: Audit Sampling ────────────────────────────────────────
  {
    id: 'bank-ch07-001', nodeId: 'audit-ch07', difficulty: 'easy', source: 'bank',
    stem: 'Sampling risk in audit sampling refers to:',
    options: [
      'The risk that the auditor selects an inappropriate sampling method',
      'The risk that the auditor\'s conclusion based on a sample differs from the conclusion if the entire population were tested',
      'The risk of arithmetic errors in the sample selection',
      'The risk that the population contains undetected errors',
    ],
    correctIndex: 1,
    explanation: 'Sampling risk arises from testing only a portion of the population. Even a well-drawn sample may not perfectly represent the population.',
    icaiReference: 'SA 530',
  },
  {
    id: 'bank-ch07-002', nodeId: 'audit-ch07', difficulty: 'medium', source: 'bank',
    stem: 'Monetary Unit Sampling (MUS) is most appropriately used for:',
    options: [
      'Tests of controls where transactions are binary (complied / not complied)',
      'Substantive testing of account balances where larger items have a higher chance of selection',
      'Attribute sampling of large populations with qualitative characteristics',
      'Evaluating the completeness of liabilities recorded',
    ],
    correctIndex: 1,
    explanation: 'MUS assigns each monetary unit an equal probability of selection, giving larger items a higher chance — ideal for substantive tests of overstatement.',
  },

  // ── Chapter 8: Analytical Procedures ────────────────────────────────
  {
    id: 'bank-ch08-001', nodeId: 'audit-ch08', difficulty: 'easy', source: 'bank',
    stem: 'Analytical procedures performed at the planning stage are primarily used to:',
    options: [
      'Obtain substantive evidence on account balances',
      'Enhance the auditor\'s understanding of the entity and identify risk areas',
      'Detect specific instances of fraud',
      'Confirm amounts disclosed in the notes to financial statements',
    ],
    correctIndex: 1,
    explanation: 'SA 520 distinguishes planning analytics (to understand the entity and identify unusual items) from final analytics.',
    icaiReference: 'SA 520',
  },
  {
    id: 'bank-ch08-002', nodeId: 'audit-ch08', difficulty: 'medium', source: 'bank',
    stem: 'When an analytical procedure produces an unexpected result, the auditor should:',
    options: [
      'Immediately conclude there is a material misstatement',
      'Disregard it if management provides an explanation',
      'Obtain and evaluate sufficient appropriate evidence to resolve the difference',
      'Reduce the planned extent of further procedures',
    ],
    correctIndex: 2,
    explanation: 'Unexpected results are red flags requiring further investigation. Management\'s explanation must be corroborated with audit evidence.',
  },

  // ── Chapter 9: Financial Statement Audit ────────────────────────────
  {
    id: 'bank-ch09-001', nodeId: 'audit-ch09', difficulty: 'medium', source: 'bank',
    stem: 'Cut-off testing for sales primarily addresses which financial statement assertion?',
    options: ['Valuation', 'Completeness', 'Occurrence and Cut-off', 'Rights and Obligations'],
    correctIndex: 2,
    explanation: 'Cut-off testing verifies that transactions are recorded in the correct accounting period — directly addressing occurrence and cut-off assertions.',
  },
  {
    id: 'bank-ch09-002', nodeId: 'audit-ch09', difficulty: 'hard', source: 'bank',
    stem: 'When auditing inventory, physical stock count observation is classified as:',
    options: [
      'An inquiry procedure',
      'An analytical procedure',
      'An inspection of tangible assets',
      'A recalculation procedure',
    ],
    correctIndex: 2,
    explanation: 'Attending a physical stock count and observing/inspecting inventory is classified as "inspection of tangible assets" under SA 500.',
    icaiReference: 'SA 501',
  },

  // ── Chapter 10: The Company Audit ───────────────────────────────────
  {
    id: 'bank-ch10-001', nodeId: 'audit-ch10', difficulty: 'easy', source: 'bank',
    stem: 'Under the Companies Act 2013, an auditor of a public company can be appointed for a maximum consecutive term of:',
    options: ['3 years', '5 years', '10 years', '15 years'],
    correctIndex: 1,
    explanation: 'Section 139 limits auditor tenure for public companies to one term of 5 consecutive years, after which mandatory rotation applies.',
    icaiReference: 'Companies Act 2013, Section 139',
  },
  {
    id: 'bank-ch10-002', nodeId: 'audit-ch10', difficulty: 'medium', source: 'bank',
    stem: 'CARO 2020 requires reporting on which of the following matters?',
    options: [
      'Management\'s assessment of going concern',
      'Details of immovable property titles and whether they are in the company\'s name',
      'Related party disclosures under Ind AS 24',
      'Auditor\'s opinion on internal financial controls',
    ],
    correctIndex: 1,
    explanation: 'CARO 2020 specifically requires reporting on whether title deeds of immovable properties are in the name of the company.',
    icaiReference: 'CARO 2020, Clause 1(i)',
  },

  // ── Chapter 11: Audit Report ─────────────────────────────────────────
  {
    id: 'bank-ch11-001', nodeId: 'audit-ch11', difficulty: 'easy', source: 'bank',
    stem: 'An "Emphasis of Matter" paragraph in an audit report:',
    options: [
      'Modifies the auditor\'s opinion',
      'Draws attention to a matter disclosed in the financial statements that is fundamental to users\' understanding, without modifying the opinion',
      'Indicates a qualified opinion due to a material misstatement',
      'Is included only when the auditor issues a disclaimer of opinion',
    ],
    correctIndex: 1,
    explanation: 'Per SA 706, an Emphasis of Matter paragraph highlights something the auditor considers fundamental without affecting the opinion.',
    icaiReference: 'SA 706',
  },
  {
    id: 'bank-ch11-002', nodeId: 'audit-ch11', difficulty: 'medium', source: 'bank',
    stem: 'A "Qualified Opinion" is issued when:',
    options: [
      'The auditor is unable to obtain sufficient appropriate audit evidence and the possible effects are pervasive',
      'There is a material misstatement or scope limitation whose effects are material but not pervasive',
      'The financial statements are free from material misstatement in all respects',
      'The going concern assumption is inappropriate',
    ],
    correctIndex: 1,
    explanation: 'SA 705: Qualified = material but NOT pervasive. Adverse = material AND pervasive misstatement. Disclaimer = material AND pervasive inability to obtain evidence.',
    icaiReference: 'SA 705',
  },

  // ── Chapter 12: Audit of Banks ───────────────────────────────────────
  {
    id: 'bank-ch12-001', nodeId: 'audit-ch12', difficulty: 'medium', source: 'bank',
    stem: 'The primary purpose of the Long Form Audit Report (LFAR) in a bank audit is to:',
    options: [
      'Replace the statutory audit report',
      'Report to the Reserve Bank of India and the bank\'s Board on specific operational and compliance matters',
      'Certify that the bank is solvent and meets capital adequacy norms',
      'Express an opinion on the bank\'s credit rating',
    ],
    correctIndex: 1,
    explanation: 'The LFAR is an additional report required by RBI covering NPA classification, IRAC norms compliance, and internal controls.',
  },
  {
    id: 'bank-ch12-002', nodeId: 'audit-ch12', difficulty: 'hard', source: 'bank',
    stem: 'Under RBI\'s IRAC norms, a loan account is classified as a Non-Performing Asset (NPA) when principal or interest remains overdue for more than:',
    options: ['30 days', '60 days', '90 days', '180 days'],
    correctIndex: 2,
    explanation: 'RBI\'s IRAC norms classify an account as NPA when principal or interest is overdue for more than 90 days.',
  },
]
