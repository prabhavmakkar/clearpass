import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/select', '/practice', '/assessment', '/history', '/profile', '/link-telegram'],
    },
    sitemap: 'https://clearpass.snpventures.in/sitemap.xml',
  }
}
