import React, { useState } from 'react';

interface AnnouncementImageProps {
  src?: string | null;
  alt?: string | null;
  className?: string;
}

export const AnnouncementImage: React.FC<AnnouncementImageProps> = ({
  src,
  alt,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return null;
  }

  return (
    <div className={`overflow-hidden rounded-xl bg-slate-100 ${className}`}>
      <img
        src={src}
        alt={alt || '소식 안내 이미지'}
        onError={() => setHasError(true)}
        className="w-full h-auto object-contain max-h-80"
        loading="lazy"
      />
    </div>
  );
};
