import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getReviews } from '../../../lib/supabase/queries';
import type { Review } from '../../../lib/types';
import { V3 } from '../design';

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365)
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}

export function ReviewsPageV3() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReviews()
      .then(setReviews)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : 'Failed to load reviews.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const featured = reviews[0] ?? null;
  const rest = reviews.slice(1);

  return (
    <div>
      {/* ── PAGE HERO ── */}
      <section
        className="py-20"
        style={{
          backgroundColor: V3.surface,
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">What Families Say</p>
          <h1
            className="v3-h font-black leading-[1.0] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}
          >
            From the LBMAA Community
          </h1>
          <p
            className="text-base leading-relaxed max-w-xl"
            style={{ color: V3.muted }}
          >
            Every review below comes from a parent or student who was exactly
            where you are right now — wondering if this is the right place.
          </p>
        </div>
      </section>

      {loading ? (
        <section className="py-32 flex justify-center">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: V3.primary }}
          />
        </section>
      ) : error ? (
        <section className="py-32 text-center" style={{ color: V3.muted }}>
          <p>Unable to load reviews. Please try again later.</p>
        </section>
      ) : reviews.length === 0 ? (
        <section className="py-32 text-center" style={{ color: V3.muted }}>
          <p className="text-sm">No reviews yet — check back soon.</p>
        </section>
      ) : (
        <>
          {/* ── FEATURED REVIEW ── */}
          {featured && (
            <section className="py-24" style={{ backgroundColor: V3.primary }}>
              <div className="max-w-7xl mx-auto px-6 md:px-10">
                <div
                  className="v3-h font-black leading-none mb-6 select-none"
                  style={{
                    fontSize: '7rem',
                    color: 'oklch(55% 0.110 20)',
                    lineHeight: 0.8,
                  }}
                  aria-hidden="true"
                >
                  "
                </div>
                <div className="mb-4">
                  <StarRow rating={featured.rating} />
                </div>
                <blockquote
                  className="v3-h font-semibold leading-[1.15] mb-6 max-w-3xl"
                  style={{
                    fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
                    color: 'white',
                  }}
                >
                  {featured.review}
                </blockquote>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'oklch(88% 0.040 20)' }}
                >
                  — {featured.display_name || 'LBMAA Parent'}
                  <span
                    className="font-normal"
                    style={{ color: 'oklch(80% 0.035 20)' }}
                  >
                    {' '}
                    · {timeAgo(featured.created_at)}
                  </span>
                </p>
              </div>
            </section>
          )}

          {/* ── ALL REVIEWS ── */}
          {rest.length > 0 && (
            <section className="py-24" style={{ backgroundColor: 'white' }}>
              <div className="max-w-7xl mx-auto px-6 md:px-10">
                <div className="grid md:grid-cols-2 gap-0 max-w-5xl">
                  {rest.map((r, i) => (
                    <div
                      key={r.review_id}
                      className="py-8 pr-12"
                      style={{
                        borderTop: `1px solid ${V3.border}`,
                        ...(i >= rest.length - 2
                          ? { borderBottom: `1px solid ${V3.border}` }
                          : {}),
                      }}
                    >
                      <div className="mb-3">
                        <StarRow rating={r.rating} />
                      </div>
                      <p
                        className="text-base leading-relaxed mb-5 italic"
                        style={{ color: V3.muted }}
                      >
                        "{r.review}"
                      </p>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: V3.text }}
                      >
                        {r.display_name || 'LBMAA Parent'}
                      </p>
                      <p className="text-xs" style={{ color: V3.muted }}>
                        {timeAgo(r.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
