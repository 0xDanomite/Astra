export function getBaseUrl() {
  const environment = process.env.NODE_ENV;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL;

  console.log('URL Resolution:', {
    environment,
    appUrl,
    vercelUrl,
    isBrowser: typeof window !== 'undefined'
  });

  if (typeof window !== 'undefined') {
    console.log('Running in browser, using relative path');
    return '';
  }

  if (appUrl) {
    console.log(`Using NEXT_PUBLIC_APP_URL: ${appUrl}`);
    return `https://${appUrl}`.replace(/^https:\/\/https:\/\//, 'https://');
  }

  if (vercelUrl) {
    const url = `https://${vercelUrl}`;
    console.log(`Using VERCEL_URL: ${url}`);
    return url;
  }

  const localUrl = `http://localhost:${process.env.PORT || 3000}`;
  console.log(`Falling back to localhost: ${localUrl}`);
  return localUrl;
}
