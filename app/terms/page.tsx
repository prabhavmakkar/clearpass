import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — ClearPass',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-gray-500 hover:text-black">&larr; Back to Home</Link>
      <h1 className="mt-6 text-3xl font-black">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: 25 April 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-lg font-bold text-black">1. Acceptance of Terms</h2>
          <p>
            By accessing or using ClearPass (<span className="font-medium">clearpass.snpventures.in</span>),
            a product of SNP Ventures, you agree to be bound by these Terms of Service. If you do not agree
            to these terms, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">2. Description of Service</h2>
          <p>
            ClearPass is an online CA exam preparation platform that provides diagnostic assessments,
            practice questions, readiness reports, and study plans. The platform is available via web
            at clearpass.snpventures.in and via the ClearPass Telegram bot.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">3. Accounts</h2>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>You must sign in using a valid Google account to access ClearPass features.</li>
            <li>You are responsible for maintaining the security of your account.</li>
            <li>You must provide accurate information and not impersonate others.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">4. Free and Paid Content</h2>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>Certain chapters are available for free, including Derivatives &amp; Valuation (CA Finals).</li>
            <li>Additional chapters such as Foreign Exchange, International Finance, and Interest Rate Risk are available for a one-time payment of &#8377;299 per chapter.</li>
            <li>Once purchased, chapter access is granted permanently to your account.</li>
            <li>Pricing is subject to change. Any price changes will not affect existing purchases.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">5. Payments</h2>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>All payments are processed securely through Razorpay.</li>
            <li>Prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes.</li>
            <li>You agree to provide accurate payment information.</li>
            <li>Please refer to our <Link href="/refund" className="underline hover:text-black">Refund Policy</Link> for details on refunds and cancellations.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">6. Intellectual Property</h2>
          <p>
            All content on ClearPass — including questions, explanations, reports, study plans, and
            the platform itself — is the intellectual property of SNP Ventures. You may not reproduce,
            distribute, or commercially exploit any content without prior written permission.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-inside list-disc space-y-1 pl-2 mt-2">
            <li>Share your account credentials or purchased content with others.</li>
            <li>Scrape, copy, or extract questions or content from the platform.</li>
            <li>Attempt to circumvent payment requirements or access controls.</li>
            <li>Use the platform for any unlawful purpose.</li>
            <li>Interfere with the operation of the platform or its infrastructure.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">8. Disclaimer</h2>
          <p>
            ClearPass is a study aid and does not guarantee exam results. The platform is provided
            &quot;as is&quot; without warranties of any kind. While we strive for accuracy in our questions
            and content, we do not warrant that all content is error-free.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, SNP Ventures shall not be liable for any indirect,
            incidental, or consequential damages arising from your use of ClearPass. Our total liability
            shall not exceed the amount paid by you for the specific service giving rise to the claim.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">10. Modifications</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be posted on this page
            with an updated date. Continued use of ClearPass after changes constitutes acceptance of
            the revised terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">11. Governing Law</h2>
          <p>
            These terms are governed by the laws of India. Any disputes shall be subject to the
            exclusive jurisdiction of the courts in Gujarat, India.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="font-medium text-black">Contact Us</p>
          <p className="mt-1">
            SNP Ventures<br />
            Email: <a href="mailto:snpventures.com@gmail.com" className="underline hover:text-black">snpventures.com@gmail.com</a><br />
            Phone: <a href="tel:+919724342494" className="underline hover:text-black">+91 97243 42494</a>
          </p>
        </section>
      </div>
    </main>
  )
}
