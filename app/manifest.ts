import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RTS Tasks',
    short_name: 'RTS Tasks',
    description: 'Worker task management by RumiTech Solutions',
    start_url: '/tasks',
    display: 'standalone',
    background_color: '#111214',
    theme_color: '#111214',
    icons: [],
  }
}
