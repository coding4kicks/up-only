'use client';

import { memo } from 'react';
import Image, { ImageProps } from 'next/image';

const MemoizedImage = memo(
  function MemoizedImage(props: ImageProps) {
    return <Image {...props} />;
  },
  (prevProps, nextProps) => {
    // Only re-render if src changes and it's not just falling back to the initial URL
    if (prevProps.src !== nextProps.src) {
      // If either URL contains "gateway", it's a fallback URL
      const prevIsGateway =
        typeof prevProps.src === 'string' && prevProps.src.includes('gateway');
      const nextIsGateway =
        typeof nextProps.src === 'string' && nextProps.src.includes('gateway');
      return !prevIsGateway && !nextIsGateway;
    }
    return true; // Don't re-render if src is the same
  }
);

MemoizedImage.displayName = 'MemoizedImage';

export default MemoizedImage;
