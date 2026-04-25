import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — ClearPass',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-gray-500 hover:text-black">&larr; Back to Home</Link>
      <h1 className="mt-6 text-3xl font-black">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: 25 April 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-lg font-bold text-black">1. Who We Are</h2>
          <p>
            ClearPass is a product of SNP Ventures. We provide CA exam preparation tools including diagnostic
            assessments, practice questions, and readiness reports. Our website is accessible at{' '}
            <span className="font-medium">clearpass.snpventures.in</span>.
          </p>
          <p className="mt-2">
            For any privacy-related concerns, contact us at{' '}
            <a href="mailto:snpventures.com@gmail.com" className="underline hover:text-black">snpventures.com@gmail.com</a>{' '}
            or call <a href="tel:+919724342494" className="underline hover:text-black">+91 97243 42494</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">2. Information We Collect</h2>
          <p className="mb-2">We collect the following types of information:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li><span className="font-medium">Account Information:</span> When you sign in with Google, we receive your name, email address, and profile picture from Google OAuth.</li>
            <li><span className="font-medium">Assessment Data:</span> Your answers, scores, readiness reports, and study plans generated from assessments you take on ClearPass.</li>
            <li><span className="font-medium">Payment Information:</span> When you purchase chapter access, payment processing is handled by Razorpay. We store your transaction ID and purchase status but do not store your card or bank details.</li>
            <li><span className="font-medium">Telegram Data:</span> If you link your Telegram account, we store your Telegram user ID to enable bot-based practice.</li>
            <li><span className="font-medium">Feedback:</span> Ratings and comments you voluntarily provide after completing assessments.</li>
            <li><span className="font-medium">Usage Data:</span> We may collect standard web analytics data such as pages visited and device type to improve the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">3. How We Use Your Information</h2>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>To authenticate your account and provide access to the platform.</li>
            <li>To generate personalised readiness reports and study plans.</li>
            <li>To track your assessment history and progress over time.</li>
            <li>To process payments for chapter access.</li>
            <li>To enable Telegram-based practice if you choose to link your account.</li>
            <li>To improve ClearPass based on aggregated usage patterns and feedback.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">4. Data Sharing</h2>
          <p>We do not sell your personal data. We share information only with:</p>
          <ul className="list-inside list-disc space-y-1 pl-2 mt-2">
            <li><span className="font-medium">Google:</span> For authentication via Google OAuth.</li>
            <li><span className="font-medium">Razorpay:</span> For payment processing. Razorpay&apos;s privacy policy governs how they handle your payment data.</li>
            <li><span className="font-medium">Telegram:</span> Your Telegram user ID is used to deliver practice questions via the ClearPass bot.</li>
            <li><span className="font-medium">Hosting Providers:</span> Our platform is hosted on Vercel and our database on Neon. These providers may process your data as part of providing their services.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">5. Data Retention</h2>
          <p>
            We retain your account information and assessment history for as long as your account is active.
            You may request deletion of your account and associated data by contacting us at{' '}
            <a href="mailto:snpventures.com@gmail.com" className="underline hover:text-black">snpventures.com@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">6. Cookies</h2>
          <p>
            ClearPass uses essential cookies to maintain your authentication session. We do not use
            third-party tracking cookies or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">7. Security</h2>
          <p>
            We use industry-standard security measures including encrypted connections (HTTPS),
            secure authentication (OAuth 2.0), and encrypted database connections. However, no method
            of electronic transmission or storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">8. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-inside list-disc space-y-1 pl-2 mt-2">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and data.</li>
            <li>Unlink your Telegram account at any time.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, email us at{' '}
            <a href="mailto:snpventures.com@gmail.com" className="underline hover:text-black">snpventures.com@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-black">9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Changes will be reflected on this page
            with an updated date. Continued use of ClearPass after changes constitutes acceptance of
            the revised policy.
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
