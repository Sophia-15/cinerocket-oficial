import { Sparkles } from 'lucide-react';
import { useState } from 'react';

type PosterProps = { title: string; posterUrl: string | null; large?: boolean };

export const Poster = ({ title, posterUrl, large = false }: PosterProps) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageSource = posterUrl && posterUrl !== failedSource ? posterUrl : null;

  return (
    <div className={`poster ${large ? 'poster-large' : ''}`}>
      {imageSource ? (
        <img
          src={imageSource}
          alt={`Pôster de ${title}`}
          onError={() => setFailedSource(imageSource)}
        />
      ) : null}
      <div className="poster-fallback">
        <Sparkles size={large ? 34 : 20} />
        <span>{title}</span>
      </div>
    </div>
  );
};
