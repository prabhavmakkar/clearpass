import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import { posts } from '@/lib/blog/posts'

export const metadata: Metadata = {
  title: 'CA Final Prep Blog — Strategy, Syllabus, and Study Plans',
  description:
    'Practical guides for CA Final students — syllabus breakdowns, ICAI standards explained, MCQ strategy, and chapter-by-chapter study plans across AFM, FR, Audit, and IDT.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'ClearPass Blog — CA Final Prep Strategy',
    description: 'Syllabus breakdowns, ICAI standards explained, and study plans for CA Final students.',
    url: 'https://clearpass.snpventures.in/blog',
    type: 'website',
  },
}

export default function BlogIndexPage() {
  const sorted = [...posts].sort((a, b) => b.publishedISO.localeCompare(a.publishedISO))
  return (
    <main className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-4 text-4xl font-black tracking-tight">CA Final Prep Blog</h1>
        <p className="mb-12 text-lg text-gray-600">
          Practical guides on the CA Final syllabus, ICAI standards, MCQ strategy, and study planning. Each post is written for students preparing for the upcoming attempt.
        </p>

        <ul className="divide-y divide-gray-100">
          {sorted.map(post => (
            <li key={post.slug} className="py-8">
              <Link href={`/blog/${post.slug}`} className="group block">
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-black">{post.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{post.excerpt}</p>
                <p className="mt-4 text-xs text-gray-400">
                  {new Date(post.publishedISO).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}{post.readMinutes} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
