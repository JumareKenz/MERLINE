export default () => {
  const env = process.env.NODE_ENV ?? 'development';
  const isProd = env === 'production';

  const requireEnv = (key: string, fallback: string) => {
    if (isProd && !process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return process.env[key] ?? fallback;
  };

  return {
    port: parseInt(process.env.PORT ?? '4000', 10),
    database: {
      url: requireEnv('DATABASE_URL', 'postgresql://merline:merline@localhost:5432/merline'),
    },
    jwt: {
      secret: requireEnv('JWT_SECRET', 'merline-dev-secret-change-in-production'),
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    },
    aws: {
      region: process.env.AWS_REGION ?? 'eu-west-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      bucket: process.env.AWS_BUCKET ?? 'merline-media-dev',
      endpoint: process.env.AWS_ENDPOINT ?? '',
    },
    ai: {
      openaiKey: process.env.OPENAI_API_KEY ?? '',
      anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
      googleKey: process.env.GOOGLE_AI_API_KEY ?? '',
      openrouterKey: process.env.OPENROUTER_API_KEY ?? '',
    },
    app: {
      url: process.env.APP_URL ?? 'http://localhost:4000',
      env,
    },
  };
};
