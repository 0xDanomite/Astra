declare namespace NodeJS {
  interface ProcessEnv {
    CDP_API_KEY: string;
    CDP_API_SECRET: string;
    CDP_ENDPOINT?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
