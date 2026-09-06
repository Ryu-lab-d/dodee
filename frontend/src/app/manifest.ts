import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Do Dee - ระบบจัดการหอพัก',
    short_name: 'Do Dee',
    description: 'ระบบบริหารจัดการหอพัก อพาร์ตเมนต์ และคอนโดครบวงจร',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0f9ff',
    theme_color: '#0e7490',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
