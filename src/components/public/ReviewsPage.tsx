import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useReviews } from '../../lib/hooks/reviews';
import type { Review } from '../../lib/types';
import { V3 } from './design';
import { useLanguage } from './lang';
import type { Lang } from './lang';

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

function timeAgo(
  dateStr: string,
  lang: Lang,
  r: {
    timeToday: string;
    time1Day: string;
    timeDays: (d: number) => string;
    timeWeeks: (w: number) => string;
    timeMonths: (m: number) => string;
    timeYears: (y: number) => string;
  },
): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000,
  );
  if (diffDays === 0) return r.timeToday;
  if (diffDays === 1) return r.time1Day;
  if (diffDays < 7) return r.timeDays(diffDays);
  if (diffDays < 30) return r.timeWeeks(Math.floor(diffDays / 7));
  if (diffDays < 365) return r.timeMonths(Math.floor(diffDays / 30));
  return r.timeYears(Math.floor(diffDays / 365));
}

function RatingSummary({
  reviews,
  overallRating,
  reviewWord,
  reviewsWord,
}: {
  reviews: Review[];
  overallRating: string;
  reviewWord: string;
  reviewsWord: string;
}) {
  if (reviews.length < 1) return null;

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <section
      className="py-5 md:py-6 px-6 md:px-10"
      style={{ backgroundColor: V3.primary }}
    >
      <div className="flex items-center gap-7 flex-wrap justify-center">
        <div className="flex-shrink-0 text-center">
          <div
            className="v3-h font-black text-white leading-none"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}
          >
            {avg.toFixed(1)}
          </div>
          <div className="my-1">
            <StarRow rating={Math.round(avg)} />
          </div>
          <div
            className="text-white uppercase tracking-wide"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            {overallRating}
          </div>
          <div
            className="italic text-xs"
            style={{ color: 'oklch(82% 0.025 20)' }}
          >
            {reviews.length} {reviews.length === 1 ? reviewWord : reviewsWord}
          </div>
        </div>

        <div
          className="hidden md:block w-px h-10"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        />

        <div className="space-y-1">
          {dist.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span
                className="text-white text-right"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  width: '1.25rem',
                }}
              >
                {star}★
              </span>
              <div
                className="relative h-1.5 rounded-full overflow-hidden"
                style={{
                  width: '5rem',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
                  style={{ width: `${(count / reviews.length) * 100}%` }}
                />
              </div>
              <span
                style={{
                  color: 'oklch(82% 0.025 20)',
                  fontSize: '0.6rem',
                  width: '1rem',
                }}
              >
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({
  review,
  defaultName,
  lang,
  timeStrings,
}: {
  review: Review;
  defaultName: string;
  lang: Lang;
  timeStrings: Parameters<typeof timeAgo>[2];
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col"
      style={{ backgroundColor: 'white', border: `1px solid ${V3.border}` }}
    >
      <div className="mb-2">
        <StarRow rating={review.rating} />
      </div>
      <p
        className="flex-1 italic leading-relaxed mb-3"
        style={{ fontSize: '0.9rem', color: V3.muted }}
      >
        "{review.review}"
      </p>
      <p className="text-sm font-semibold" style={{ color: V3.text }}>
        {review.display_name || defaultName}
      </p>
      <p className="text-xs mt-0.5" style={{ color: V3.muted }}>
        {timeAgo(review.created_at, lang, timeStrings)}
      </p>
    </div>
  );
}

export function ReviewsPage() {
  const { data: reviews = [], isLoading: loading, isError } = useReviews();
  const { t, lang } = useLanguage();
  const rv = t.reviews;
  const [visibleCount, setVisibleCount] = useState(6);

  const visible = reviews.slice(0, visibleCount);
  const remaining = reviews.length - visibleCount;

  const timeStrings = {
    timeToday: rv.timeToday,
    time1Day: rv.time1Day,
    timeDays: rv.timeDays,
    timeWeeks: rv.timeWeeks,
    timeMonths: rv.timeMonths,
    timeYears: rv.timeYears,
  };

  return (
    <div>
      {/* Hero */}
      <section
        className="py-14"
        style={{
          backgroundColor: 'white',
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">{rv.eyebrow}</p>
          <h1
            className="v3-h font-black leading-[1.0] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}
          >
            {rv.heading}
          </h1>
          <p
            className="text-base leading-relaxed max-w-xl"
            style={{ color: V3.muted }}
          >
            {rv.sub}
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
      ) : isError ? (
        <section className="py-32 text-center" style={{ color: V3.muted }}>
          <p>{rv.errLoad}</p>
        </section>
      ) : reviews.length === 0 ? (
        <section className="py-32 text-center" style={{ color: V3.muted }}>
          <p className="text-sm">{rv.noReviews}</p>
        </section>
      ) : (
        <>
          <RatingSummary
            reviews={reviews}
            overallRating={rv.overallRating}
            reviewWord={rv.review}
            reviewsWord={rv.reviews}
          />

          {/* Card grid */}
          <section
            className="py-6 px-6 md:px-10"
            style={{ backgroundColor: V3.surface }}
          >
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visible.map((r) => (
                  <ReviewCard
                    key={r.review_id}
                    review={r}
                    defaultName={rv.defaultName}
                    lang={lang}
                    timeStrings={timeStrings}
                  />
                ))}
              </div>
              {remaining > 0 && (
                <div className="mt-4 text-center">
                  <button
                    className="v3-btn-outline"
                    onClick={() => setVisibleCount((c) => c + 6)}
                  >
                    {rv.loadMore}
                  </button>
                  <p className="text-xs mt-2" style={{ color: V3.muted }}>
                    {rv.moreLabel(remaining)}
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
