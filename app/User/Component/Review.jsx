import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useUserStore } from '../../../Backend/Zustand/UserStore.ts';
import { lightTheme as reviewLightTheme } from '../../../Theme/Component/ReviewTheme.ts';
import { addProductReview, deleteProductReview, getProductReviews, updateProductReview } from '../../../Backend/Firebase/DBAPI';

const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return '';
  const dateObj = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString();
};

const Review = ({ productId, theme }) => {
  const resolvedTheme = theme || reviewLightTheme;

  const user = useUserStore((state) => state.user);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const currentUserId = user?.uid || user?.id || null;

  const [reviews, setReviews] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const userReview = useMemo(
    () => reviews.find((review) => review.userId === currentUserId) || null,
    [reviews, currentUserId]
  );

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  const ratingDistribution = {
    5: reviews.filter((review) => review.rating === 5).length,
    4: reviews.filter((review) => review.rating === 4).length,
    3: reviews.filter((review) => review.rating === 3).length,
    2: reviews.filter((review) => review.rating === 2).length,
    1: reviews.filter((review) => review.rating === 1).length,
  };

  const loadReviews = async (append = false) => {
    if (!productId) return;
    if (append && !hasMore) return;

    append ? setLoadingMore(true) : setLoading(true);

    try {
      const response = await getProductReviews(productId, append ? cursor : null, PAGE_SIZE);

      if (!response.success) {
        setError(response.error || 'Failed to load reviews');
        return;
      }

      setError('');
      setReviews((prev) => (append ? [...prev, ...response.items] : response.items));
      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (err) {
      setError('Failed to load reviews');
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  };

  useEffect(() => {
    setReviews([]);
    setCursor(null);
    setHasMore(false);
    setError('');
    setShowForm(false);
    setComment('');
    setRating(0);
    setEditingReviewId(null);

    if (productId) {
      loadReviews(false);
    }
  }, [productId]);

  const renderStars = (value, size = 20) => (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          style={{
            fontSize: size,
            color: star <= value ? resolvedTheme.starActive : resolvedTheme.starInactive,
          }}
        >
          {star <= value ? '★' : '☆'}
        </Text>
      ))}
    </View>
  );

  const renderRatingBar = (starCount, count) => {
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return (
      <View style={styles(resolvedTheme).ratingBarContainer}>
        <Text style={styles(resolvedTheme).ratingBarLabel}>{starCount} star</Text>
        <View style={[styles(resolvedTheme).ratingBarBackground, { backgroundColor: resolvedTheme.barBg }]}>
          <View style={[styles(resolvedTheme).ratingBarFill, { width: `${percentage}%`, backgroundColor: resolvedTheme.barFill }]} />
        </View>
        <Text style={styles(resolvedTheme).ratingBarCount}>{count}</Text>
      </View>
    );
  };

  const handleOpenForm = () => {
    if (!isLoggedIn) {
      Alert.alert('You must be logged in to write a review');
      return;
    }

    if (userReview) {
      setEditingReviewId(userReview.id);
      setRating(userReview.rating);
      setComment(userReview.comment);
    } else {
      setEditingReviewId(null);
      setRating(0);
      setComment('');
    }

    setShowForm(true);
  };

  const handleSubmitReview = async () => {
    if (!isLoggedIn) {
      Alert.alert('You must be logged in to write a review');
      return;
    }

    if (!rating || !comment.trim()) {
      Alert.alert('Missing info', 'Please select a rating and enter a comment.');
      return;
    }

    if (!currentUserId) {
      Alert.alert('You must be logged in to write a review');
      return;
    }

    setSubmitting(true);

    try {
      const trimmedComment = comment.trim();

      if (editingReviewId || userReview) {
        const targetReviewId = editingReviewId || userReview?.id;
        const response = await updateProductReview(targetReviewId, currentUserId, {
          rating,
          comment: trimmedComment,
          username: user?.username,
          userImage: user?.image,
        });

        if (!response.success) {
          if (response.code === 'REVIEW_EXISTS') {
            Alert.alert('You already reviewed this product');
          }
          setError(response.error || 'Unable to update review');
          return;
        }

        setReviews((prev) => prev.map((rev) => (rev.id === response.review?.id ? response.review : rev)));
      } else {
        const response = await addProductReview(productId, currentUserId, {
          rating,
          comment: trimmedComment,
          username: user?.username,
          userImage: user?.image,
        });

        if (!response.success) {
          if (response.code === 'REVIEW_EXISTS') {
            Alert.alert('You already reviewed this product');
          }
          setError(response.error || 'Unable to add review');
          return;
        }

        if (response.review) {
          setReviews((prev) => [response.review, ...prev]);
        }
      }

      setError('');
      setShowForm(false);
      setComment('');
      setRating(0);
      setEditingReviewId(null);
    } catch (err) {
      setError('Something went wrong while saving your review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!isLoggedIn) {
      Alert.alert('You must be logged in to write a review');
      return;
    }

    setDeletingId(reviewId);
    try {
      const response = await deleteProductReview(reviewId, currentUserId);

      if (!response.success) {
        setError(response.error || 'Unable to delete review');
        return;
      }

      setReviews((prev) => prev.filter((rev) => rev.id !== reviewId));
      if (editingReviewId === reviewId) {
        setShowForm(false);
        setComment('');
        setRating(0);
        setEditingReviewId(null);
      }
    } catch (err) {
      setError('Something went wrong while deleting your review');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (reviewId) => {
    if (!isLoggedIn) {
      Alert.alert('You must be logged in to write a review');
      return;
    }

    Alert.alert('Delete review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteReview(reviewId) },
    ]);
  };

  return (
    <ScrollView style={[styles(resolvedTheme).container, { backgroundColor: resolvedTheme.background }]}>
      <View style={[styles(resolvedTheme).summaryContainer, { backgroundColor: resolvedTheme.cardBackground, shadowColor: resolvedTheme.cardShadow }]}>
        <Text style={[styles(resolvedTheme).averageRatingText, { color: resolvedTheme.titleText }]}>Product Rating</Text>
        <View style={styles(resolvedTheme).averageRatingContainer}>
          <Text style={[styles(resolvedTheme).averageRating, { color: resolvedTheme.titleText }]}>{averageRating.toFixed(1)}</Text>
          <View style={styles(resolvedTheme).averageStars}>
            {renderStars(Math.round(averageRating), 24)}
            <Text style={[styles(resolvedTheme).reviewCount, { color: resolvedTheme.secondaryText }]}>{reviews.length} reviews</Text>
          </View>
        </View>

        <View style={styles(resolvedTheme).distributionContainer}>
          {[5, 4, 3, 2, 1].map((starCount) => (
            <View key={`rating-${starCount}`}>
              {renderRatingBar(starCount, ratingDistribution[starCount])}
            </View>
          ))}
        </View>
      </View>

      {error ? (
        <Text style={[styles(resolvedTheme).statusText, { color: '#e74c3c' }]}>Error on fetch Reviews : {error}</Text>
      ) : null}

      {loading && reviews.length === 0 ? (
        <View style={styles(resolvedTheme).loadingContainer}>
          <ActivityIndicator color={resolvedTheme.starActive} />
          <Text style={[styles(resolvedTheme).statusText, { color: resolvedTheme.secondaryText }]}>Loading reviews...</Text>
        </View>
      ) : null}

      {!loading && reviews.length === 0 && !error ? (
        <Text style={[styles(resolvedTheme).statusText, { color: resolvedTheme.secondaryText }]}>No reviews yet. Be the first to share your thoughts.</Text>
      ) : null}

      {reviews.map((review) => (
        <View key={review.id} style={[styles(resolvedTheme).card, { backgroundColor: resolvedTheme.cardBackground, shadowColor: resolvedTheme.cardShadow }]}>
          <Image source={{ uri: review.userImage || 'https://via.placeholder.com/50' }} style={styles(resolvedTheme).image} />
          <View style={styles(resolvedTheme).textContainer}>
            <View style={styles(resolvedTheme).reviewHeader}>
              <Text style={[styles(resolvedTheme).username, { color: resolvedTheme.primaryText }]}>{review.username}</Text>
              <Text style={[styles(resolvedTheme).date, { color: resolvedTheme.secondaryText }]}>{formatDate(review.createdAt) || 'Just now'}</Text>
            </View>
            <View style={styles(resolvedTheme).ratingContainer}>{renderStars(review.rating)}</View>
            <Text style={[styles(resolvedTheme).comment, { color: resolvedTheme.accentText }]}>{review.comment}</Text>
            {review.lastUpdatedAt ? (
              <Text style={[styles(resolvedTheme).editedText, { color: resolvedTheme.secondaryText }]}>Edited on {formatDate(review.lastUpdatedAt)}</Text>
            ) : null}

            {review.userId === currentUserId ? (
              <View style={styles(resolvedTheme).actionRow}>
                <TouchableOpacity
                  style={[styles(resolvedTheme).actionButton, { borderColor: resolvedTheme.submitBtnBg, backgroundColor: resolvedTheme.submitBtnBg }]}
                  onPress={() => {
                    setEditingReviewId(review.id);
                    setRating(review.rating);
                    setComment(review.comment);
                    setShowForm(true);
                  }}
                >
                  <Text style={[styles(resolvedTheme).actionButtonText, { color: resolvedTheme.submitBtnText }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles(resolvedTheme).actionButton, { borderColor: resolvedTheme.cancelBtnBg, backgroundColor: resolvedTheme.cancelBtnBg }]}
                  onPress={() => confirmDelete(review.id)}
                  disabled={deletingId === review.id}
                >
                  <Text style={[styles(resolvedTheme).actionButtonText, { color: resolvedTheme.cancelBtnText }]}>
                    {deletingId === review.id ? 'Deleting...' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      ))}

      {hasMore ? (
        <TouchableOpacity
          style={[styles(resolvedTheme).loadMoreButton, { backgroundColor: resolvedTheme.addBtnBg }]}
          onPress={() => loadReviews(true)}
          disabled={loadingMore}
        >
          <Text style={[styles(resolvedTheme).addReviewButtonText, { color: resolvedTheme.addBtnText }]}>
            {loadingMore ? 'Loading...' : 'Load more reviews'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {!showForm && (
        <TouchableOpacity
          style={[styles(resolvedTheme).addReviewButton, { backgroundColor: resolvedTheme.addBtnBg }]}
          onPress={handleOpenForm}
        >
          <Text style={[styles(resolvedTheme).addReviewButtonText, { color: resolvedTheme.addBtnText }]}>
            {userReview ? 'Edit your review' : '+ Add your review'}
          </Text>
        </TouchableOpacity>
      )}

      {showForm && (
        <View style={[styles(resolvedTheme).formContainer, { backgroundColor: resolvedTheme.cardBackground, shadowColor: resolvedTheme.cardShadow }]}>
          <Text style={[styles(resolvedTheme).formTitle, { color: resolvedTheme.titleText }]}>Write a Review</Text>
          <View style={styles(resolvedTheme).starsContainer}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity key={num} onPress={() => setRating(num)}>
                <Text style={rating >= num ? [styles(resolvedTheme).starSelected, { color: resolvedTheme.starActive }] : [styles(resolvedTheme).star, { color: resolvedTheme.starInactive }]}>
                  {rating >= num ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles(resolvedTheme).input, { backgroundColor: resolvedTheme.inputBg, borderColor: resolvedTheme.inputBorder, color: resolvedTheme.inputText }]}
            placeholder="Share your experience with this product..."
            placeholderTextColor={resolvedTheme.inputPlaceholder}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
          />
          <View style={styles(resolvedTheme).formButtons}>
            <TouchableOpacity
              style={[styles(resolvedTheme).cancelButton, { backgroundColor: resolvedTheme.cancelBtnBg }]}
              onPress={() => {
                setShowForm(false);
                setComment('');
                setRating(0);
                setEditingReviewId(null);
              }}
              disabled={submitting}
            >
              <Text style={[styles(resolvedTheme).cancelButtonText, { color: resolvedTheme.cancelBtnText }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles(resolvedTheme).submitButton, { backgroundColor: resolvedTheme.submitBtnBg }]}
              onPress={handleSubmitReview}
              disabled={submitting}
            >
              <Text style={[styles(resolvedTheme).submitButtonText, { color: resolvedTheme.submitBtnText }]}>
                {submitting ? 'Saving...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, padding: 20 },
  summaryContainer: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  averageRatingText: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  averageRatingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  averageRating: { fontSize: 36, fontWeight: 'bold', marginRight: 15 },
  averageStars: { flex: 1 },
  reviewCount: { fontSize: 14, marginTop: 5 },
  distributionContainer: { marginTop: 10 },
  ratingBarContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  ratingBarLabel: { width: 50, fontSize: 12 },
  ratingBarBackground: { flex: 1, height: 8, borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  ratingBarFill: { height: '100%', borderRadius: 4 },
  ratingBarCount: { width: 30, fontSize: 12, textAlign: 'right' },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  textContainer: { flex: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  username: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 12 },
  ratingContainer: { marginBottom: 8 },
  comment: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  editedText: { fontSize: 12, marginBottom: 6 },
  actionRow: { flexDirection: 'row', marginTop: 8 },
  actionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
  addReviewButton: { borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  addReviewButtonText: { fontSize: 16, fontWeight: '600' },
  loadMoreButton: { borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 10, marginBottom: 10 },
  formContainer: {
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
    marginBottom: 25,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  starsContainer: { flexDirection: 'row', marginBottom: 15, justifyContent: 'center' },
  star: { fontSize: 30, marginRight: 8 },
  starSelected: { fontSize: 30, marginRight: 8 },
  formButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  submitButton: { borderRadius: 8, padding: 14, flex: 1, marginLeft: 10, alignItems: 'center' },
  submitButtonText: { fontSize: 16, fontWeight: '600' },
  cancelButton: { borderRadius: 8, padding: 14, flex: 1, marginRight: 10, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  statusText: { fontSize: 14, marginBottom: 10 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
});

export default Review;