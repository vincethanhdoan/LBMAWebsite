import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Star, Loader2 } from 'lucide-react';
import { getReviews } from '../../../lib/supabase/queries';

const BASE = '/experimental/public';

type Review = {
  parentName: string;
  rating: number;
  date: string;
  review: string;
};

function StarRow({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'sm' | 'md';
}) {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.parentName
    .split(' ')
    .map((n) => n[0])
    .join('');
  return (
    <div className="bg-white border border-border rounded-xl p-6 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback className="text-xs bg-primary/8 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold leading-tight">
            {review.parentName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <StarRow rating={review.rating} />
            <span className="text-xs text-muted-foreground">{review.date}</span>
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-foreground flex-1">
        "{review.review}"
      </p>
    </div>
  );
}

function RatingSummary({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const rounded = Math.round(avg * 10) / 10;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="bg-white border border-border rounded-xl p-6 flex flex-col sm:flex-row gap-8 items-start sm:items-center mb-10 max-w-2xl">
      {/* Average */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <span className="text-5xl font-bold text-foreground leading-none">
          {rounded.toFixed(1)}
        </span>
        <StarRow rating={Math.round(avg)} size="md" />
        <span className="text-xs text-muted-foreground mt-1">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Distribution bars */}
      <div className="flex-1 w-full space-y-1.5">
        {distribution.map(({ star, count }) => {
          const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">
                {star}
              </span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-4 flex-shrink-0">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewsPageV2() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getReviews();
        const formatted: Review[] = data.map((r: any) => {
          const created = new Date(r.created_at);
          const diffDays = Math.floor(
            (Date.now() - created.getTime()) / 86400000,
          );
          const dateStr =
            diffDays === 0
              ? 'Today'
              : diffDays === 1
                ? '1 day ago'
                : diffDays < 7
                  ? `${diffDays} days ago`
                  : diffDays < 30
                    ? `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
                    : diffDays < 365
                      ? `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
                      : `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;

          return {
            parentName: r.display_name || 'LBMAA Parent',
            rating: r.rating,
            date: dateStr,
            review: r.review,
          };
        });
        setReviews(formatted);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      {/* ── PAGE HEADER ── */}
      <section className="py-14 border-b bg-slate-50">
        <div className="container mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Reviews
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            What families are saying.
          </h1>
          <p className="text-muted-foreground text-base max-w-xl">
            Honest words from parents who were in the same position you're in
            right now.
          </p>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2
                className="w-6 h-6 animate-spin text-primary"
                aria-label="Loading reviews"
              />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm py-12">
              No reviews yet — check back soon.
            </p>
          ) : (
            <>
              <RatingSummary reviews={reviews} />
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
                {reviews.map((review, i) => (
                  <ReviewCard key={i} review={review} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── CLOSING ── */}
      <section className="py-16 bg-slate-50 border-t">
        <div className="container mx-auto px-6 max-w-lg text-center">
          <h2 className="text-2xl font-bold mb-3">See it for yourself.</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            The first class is free. No uniform, no commitment — just come and
            meet us.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
            <button
              onClick={() => navigate(`${BASE}/contact?intent=trial`)}
              className="font-semibold text-primary hover:underline min-h-[44px] inline-flex items-center"
            >
              Book a free trial class
            </button>
            <span className="hidden sm:block text-muted-foreground">·</span>
            <a
              href="tel:+12095550123"
              className="font-medium text-foreground hover:underline inline-flex items-center min-h-[44px]"
            >
              (209) 555-0123
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
