'use client';

import { memo } from 'react';
import Image, { ImageProps } from 'next/image';

const MemoizedImage = memo(function MemoizedImage(props: ImageProps) {
  return <Image {...props} />;
});

MemoizedImage.displayName = 'MemoizedImage';

export default MemoizedImage;
