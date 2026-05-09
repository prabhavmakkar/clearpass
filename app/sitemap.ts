import type { MetadataRoute } from 'next'
import { getSubjects, getSections, getChapters } from '@/lib/queries'
import { posts } from '@/lib/blog/posts'

const BASE = 'https://clearpass.snpventures.in'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/learn`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/sign-in`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/refund`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const blogEntries: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.updatedISO),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const subjects = await getSubjects()
  const finalSubjects = subjects.filter(s => s.id.startsWith('ca-final-'))

  const subjectEntries: MetadataRoute.Sitemap = finalSubjects.map(s => ({
    url: `${BASE}/learn/${s.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const chapterEntries: MetadataRoute.Sitemap = []
  for (const s of finalSubjects) {
    const sections = await getSections(s.id)
    if (sections.length === 0) continue
    const chapters = await getChapters(sections.map(sec => sec.id))
    for (const ch of chapters) {
      const last = ch.id.split('/').pop()
      if (!last) continue
      chapterEntries.push({
        url: `${BASE}/learn/${s.id}/${last}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  }

  return [...staticEntries, ...blogEntries, ...subjectEntries, ...chapterEntries]
}
