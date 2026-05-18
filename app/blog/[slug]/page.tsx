import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Nav from '@/components/landing/Nav'
import { posts, getPostBySlug } from '@/lib/blog/posts'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://clearpass.snpventures.in/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedISO,
      modifiedTime: post.updatedISO,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedISO,
    dateModified: post.updatedISO,
    author: { '@type': 'Organization', name: 'ClearPass' },
    publisher: {
      '@type': 'Organization',
      name: 'ClearPass',
      logo: {
        '@type': 'ImageObject',
        url: 'https://clearpass.snpventures.in/icon.svg',
      },
    },
    mainEntityOfPage: `https://clearpass.snpventures.in/blog/${post.slug}`,
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />

        <nav className="mb-6 text-xs text-gray-500">
          <Link href="/blog" className="underline underline-offset-2 hover:text-black">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{post.title}</span>
        </nav>

        <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight md:text-5xl">{post.title}</h1>
        <p className="mb-10 text-xs text-gray-400">
          {new Date(post.publishedISO).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}{post.readMinutes} min read
        </p>

        <div
          className="blog-body"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {post.related.length > 0 && (
          <section className="mt-16 border-t border-gray-100 pt-8">
            <p className="mb-4 text-xs uppercase tracking-wider text-gray-400">Related</p>
            <ul className="space-y-2">
              {post.related.map(r => (
                <li key={r.href}>
                  <Link href={r.href} className="text-sm font-medium text-gray-800 underline underline-offset-2 hover:text-black">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12 rounded-xl bg-gray-900 px-6 py-6 text-white">
          <p className="text-sm font-bold">Practise CA Final MCQs on ClearPass</p>
          <p className="mt-1 text-xs text-gray-300">All four CA Final subjects, ICAI-aligned, ₹299 for the full bundle.</p>
          <Link
            href="/select"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100"
          >
            Start practising
          </Link>
        </div>
      </article>
    </main>
  )
}
