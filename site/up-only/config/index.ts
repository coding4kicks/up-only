console.log('ENV:', process.env.NEXT_PUBLIC_ALCHEMY_API_KEY); // Temporary debug log

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
  throw new Error('Missing NEXT_PUBLIC_ALCHEMY_API_KEY environment variable');
}

export const config = {
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
} as const;
