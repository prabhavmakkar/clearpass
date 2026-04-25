import Link from 'next/link'

export const metadata = {
  title: 'Refund Policy — ClearPass',
}

export default function RefundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-gray-500 hover:text-black">&larr; Back to Home</Link>
      <h1 className="mt-6 text-3xl font-black">Refund Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: 25 April 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-lg font-bold text-black">1. Digital Products — No Refunds</h2>
          <p>
            ClearPass offers digital educational content in the form of chapter-based practice questions,
            assessments, and study tools. Since access to paid chapters is granted immediately upon
            successful payment, <span className="font-semibold text-black">we do not offer refunds</span> on
            any chapter purchases.
          </p>
          <p className="mt-2">
            By completing a purchase, you acknowledge that you are buying access to digital content
            that is delivered instantly, and you agree to waive any right to a refund.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">2. Pricing</h2>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>The Derivatives &amp; Valuation chapter (CA Finals) is available <span className="font-medium">free of charge</span>.</li>
            <li>Paid chapters — including Foreign Exchange, International Finance, and Interest Rate Risk — are priced at <span className="font-medium">&#8377;299 per chapter</span> (one-time payment).</li>
            <li>All prices are in Indian Rupees (INR) and are inclusive of applicable taxes.</li>
            <li>Once purchased, access is permanent and tied to your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">3. Payment Issues</h2>
          <p>
            If you experience a payment failure, double charge, or a situation where payment was deducted
            but access was not granted, please contact us immediately. We will investigate and resolve
            the issue within 3-5 business days.
          </p>
          <p className="mt-2">
            In cases of verified double charges or payment errors, we will process a full refund of
            the duplicate or erroneous amount.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">4. Free Content</h2>
          <p>
            Free chapters do not require payment and can be accessed by any registered user at no cost.
            No refund questions arise for free content.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">5. Concerns and Disputes</h2>
          <p>
            If you have any concerns about a purchase or believe there has been an error, please
            reach out to us. We are committed to resolving issues fairly and promptly.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="font-medium text-black">Contact Us</p>
          <p className="mt-1">
            SNP Ventures<br />
            Email: <a href="mailto:snpventures.com@gmail.com" className="underline hover:text-black">snpventures.com@gmail.com</a><br />
            Phone: <a href="tel:+919724342494" className="underline hover:text-black">+91 97243 42494</a>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Please include your registered email address and transaction details when contacting us
            about payment issues.
          </p>
        </section>
      </div>
    </main>
  )
}
