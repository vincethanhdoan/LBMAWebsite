import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Star, Edit2, Check, Loader2 } from 'lucide-react';
import { getUserReview, getFamilyByOwner, getGuardiansByFamily } from '../../lib/supabase/queries';
import { formatDate } from '../../lib/format';
import { createReview, updateReview } from '../../lib/supabase/mutations';
import type { User as AppUser, Review, Rating } from '../../lib/types';

type ReviewTabProps = {
  user: NonNullable<AppUser>;
};

export function ReviewTab({ user }: ReviewTabProps) {
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState<Rating>(5);
  const [reviewText, setReviewText] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [primaryName, setPrimaryName] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [data, family] = await Promise.all([
          getUserReview(user.id),
          getFamilyByOwner(user.id),
        ]);
        setExistingReview(data);
        if (data) {
          setRating(data.rating);
          setReviewText(data.review);
        }
        if (family) {
          const guardians = await getGuardiansByFamily(family.family_id);
          const primary = guardians.find(g => g.is_primary_contact) ?? guardians[0];
          if (primary) setPrimaryName(`${primary.first_name} ${primary.last_name}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load review');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  const handleSaveReview = async () => {
    if (!reviewText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (existingReview) {
        const updated = await updateReview(existingReview.review_id, { rating, review: reviewText.trim() });
        setExistingReview(updated);
      } else {
        const family = await getFamilyByOwner(user.id);
        if (!family) throw new Error('Family profile not found. Please complete your profile first.');
        const created = await createReview({
          family_id: family.family_id,
          author_user_id: user.id,
          display_name: primaryName ?? null,
          rating,
          review: reviewText.trim(),
        });
        setExistingReview(created);
      }
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleEditReview = () => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review);
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review);
    } else {
      setRating(5);
      setReviewText('');
    }
    setIsEditing(false);
    setError(null);
  };

  const isAddingNew = !existingReview;
  const showForm = isAddingNew || isEditing;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-3" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Share Your Experience</h2>
        <p className="text-muted-foreground mt-1">
          Your review will be published on our public website to help prospective families
        </p>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-2">{error}</div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isAddingNew ? 'Write a Review' : 'Your Review'}</CardTitle>
              <CardDescription>
                {isAddingNew
                  ? "Share your family's experience at LBMAA with prospective families"
                  : 'Published on the public website'}
              </CardDescription>
            </div>
            {existingReview && !isEditing && (
              <Button variant="outline" onClick={handleEditReview}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Review
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showForm ? (
            <div className="space-y-6">
              {/* Rating */}
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-2">
                  {([1, 2, 3, 4, 5] as const).map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoveredStar || rating)
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {rating} {rating === 1 ? 'star' : 'stars'}
                  </span>
                </div>
              </div>

              {/* Review text */}
              <div className="space-y-2">
                <Label>Your Review</Label>
                <Textarea
                  placeholder="Share your experience at LBMAA. What has your family's journey been like? How have the instructors and programs impacted your children?"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="min-h-[200px]"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">{reviewText.length}/2000 characters</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleSaveReview} disabled={saving || !reviewText.trim()}>
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-2" />{isAddingNew ? 'Submit Review' : 'Save Changes'}</>
                  )}
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                )}
              </div>

              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Your review will be published using your name &ldquo;{primaryName ?? user.displayName}&rdquo;
                  and will appear publicly on the LBMAA website.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stars */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= existingReview!.rating
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {existingReview!.rating} out of 5 stars
                </span>
              </div>

              {/* Body */}
              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{existingReview!.review}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Published by {existingReview!.display_name ?? user.displayName}</span>
                <span>
                  {existingReview!.updated_at !== existingReview!.created_at
                    ? `Updated ${formatDate(existingReview!.updated_at)}`
                    : `Posted ${formatDate(existingReview!.created_at)}`}
                </span>
              </div>

              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✓ Your review is live on the public website and helping prospective families learn about LBMAA!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {[
            'Be honest and authentic about your family\'s experience',
            'Share specific examples of how LBMAA has impacted your children',
            'Keep your review respectful and constructive',
            'Focus on your personal experience with the instructors, programs, and community',
            'You can edit your review anytime to keep it current',
          ].map((item) => (
            <div key={item} className="flex gap-2">
              <span className="text-primary">•</span>
              <p>{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
