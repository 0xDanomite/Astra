export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // browser should use relative path
    return '';
  }

  if (process.env.VERCEL_URL) {
    // reference for vercel.com
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    // reference for render.com or custom domain
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // assume localhost
  return `http://localhost:${process.env.PORT || 3000}`;
}
