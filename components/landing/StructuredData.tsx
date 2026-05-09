// Server component — renders JSON-LD structured data for SEO.
// Read by Google to understand the site identity and the educational courses on offer.
// Reference: https://developers.google.com/search/docs/appearance/structured-data

const SITE_URL = 'https://clearpass.snpventures.in'

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ClearPass',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    'CA Final exam preparation platform — diagnostic assessments, ICAI-style practice questions, and readiness reports for Chartered Accountancy students.',
  email: 'snpventures.com@gmail.com',
  sameAs: ['https://t.me/ClearpassCAbot'],
}

const subjects: Array<{ id: string; name: string; description: string }> = [
  {
    id: 'ca-final-afm',
    name: 'CA Final — Advanced Financial Management (AFM)',
    description:
      'ICAI-aligned MCQ practice for CA Final AFM: Financial Policy, Risk Management, Capital Budgeting, Security Analysis & Valuation, Portfolio Management, Securitization, Mutual Funds, Derivatives, Forex, International Finance, Interest Rate Risk, Mergers & Acquisitions, and Startup Finance.',
  },
  {
    id: 'ca-final-fr',
    name: 'CA Final — Financial Reporting (FR)',
    description:
      'ICAI-aligned MCQ practice for CA Final FR: Ind AS framework, presentation, measurement and recognition, employee benefits, foreign exchange, disclosures, EPS, impairment, financial instruments, group accounts, revenue, leases, fair value, and analysis.',
  },
  {
    id: 'ca-final-audit',
    name: 'CA Final — Auditing & Ethics',
    description:
      'ICAI-aligned MCQ practice for CA Final Audit: Quality Control, Core Auditing Principles, Audit Planning & Risk, Audit Evidence, Completion & Reporting, Assurance Services, Specialised Audits, Internal Advisory, and Professional Ethics & ESG.',
  },
  {
    id: 'ca-final-idt',
    name: 'CA Final — Indirect Tax Laws (IDT)',
    description:
      'ICAI-aligned MCQ practice for CA Final IDT: GST levy and supply, charge of GST, place of supply, exemptions, time and value of supply, input tax credit, registration, returns, e-commerce, refunds, customs, and Foreign Trade Policy.',
  },
]

function courseSchema(subject: { id: string; name: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: subject.name,
    description: subject.description,
    provider: {
      '@type': 'Organization',
      name: 'ClearPass',
      url: SITE_URL,
    },
    educationalLevel: 'Professional',
    inLanguage: 'en-IN',
    offers: {
      '@type': 'Offer',
      price: '299',
      priceCurrency: 'INR',
      url: `${SITE_URL}/select`,
      availability: 'https://schema.org/InStock',
      description: 'Single ₹299 purchase unlocks all four CA Final subjects on ClearPass.',
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      courseWorkload: 'PT2H',
    },
  }
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ClearPass',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/select?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export function StructuredData() {
  const blocks = [
    organization,
    websiteSchema,
    ...subjects.map(courseSchema),
  ]
  return (
    <>
      {blocks.map((block, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  )
}
