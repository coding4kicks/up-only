const fs = require('fs');
const path = require('path');

const metadataDir = path.join(process.cwd(), '../..', 'UpOnlyNFTs', 'metadata');
const outputFile = path.join(process.cwd(), 'data', 'nft-metadata.ts');

const generateMetadataFile = () => {
  const metadata = [];

  for (let i = 1; i <= 131; i++) {
    const filePath = path.join(metadataDir, `${i}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    metadata.push(JSON.parse(fileContent));
  }

  const fileContent = `import type { NFTMetadata } from '@/types/nft';

export const nftMetadata: NFTMetadata[] = ${JSON.stringify(metadata, null, 2)};
`;

  fs.writeFileSync(outputFile, fileContent);
  console.log('Metadata file generated successfully!');
};

generateMetadataFile();
