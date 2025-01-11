const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs',
  'https://ipfs.io/ipfs',
  'https://cloudflare-ipfs.com/ipfs'
];

export const getIPFSUrl = (hash: string, gatewayIndex = 0) => {
  return `${IPFS_GATEWAYS[gatewayIndex]}/${hash}`;
};

export const getFallbackIPFSUrl = (
  hash: string,
  currentGatewayIndex: number
) => {
  const nextIndex = (currentGatewayIndex + 1) % IPFS_GATEWAYS.length;
  return getIPFSUrl(hash, nextIndex);
};
