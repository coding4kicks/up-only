import { nftMetadata } from '@/data/nft-metadata';

export function generateStaticParams() {
  return nftMetadata.map(nft => ({
    nftName: nft.name.replace(/\s+/g, '_')
  }));
}

export default function NFTLayout({ children }: { children: React.ReactNode }) {
  return children;
}
