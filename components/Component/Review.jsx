import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserData } from "../../Firebase/Firebase";
import { darkTheme as reviewDarkTheme, lightTheme as reviewLightTheme } from '../../Theme/Component/ReviewTheme';

const Review = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [theme, setTheme] = useState(reviewLightTheme);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const mode = await AsyncStorage.getItem('ThemeMode');
        setTheme(mode === "2" ? reviewDarkTheme : reviewLightTheme);
      } catch {
        setTheme(reviewLightTheme);
      }
    };
    loadTheme();
    const id = setInterval(loadTheme, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!productId) return;

    const reviewsRef = collection(db, 'products', productId, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReviews(loadedReviews);
    });

    return () => unsubscribe();
  }, [productId]);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = {
    5: reviews.filter(review => review.rating === 5).length,
    4: reviews.filter(review => review.rating === 4).length,
    3: reviews.filter(review => review.rating === 3).length,
    2: reviews.filter(review => review.rating === 2).length,
    1: reviews.filter(review => review.rating === 1).length,
  };

  const handleReaction = (reviewId, reactionType) => {
    setReviews(reviews.map(review => {
      if (review.id === reviewId) {
        if (review.userReaction === reactionType) {
          return {
            ...review,
            likes: reactionType === 'like' ? review.likes - 1 : review.likes,
            dislikes: reactionType === 'dislike' ? review.dislikes - 1 : review.dislikes,
            userReaction: null
          };
        }
        else if (review.userReaction) {
          return {
            ...review,
            likes: reactionType === 'like' ? review.likes + 1 : review.likes - 1,
            dislikes: reactionType === 'dislike' ? review.dislikes + 1 : review.dislikes - 1,
            userReaction: reactionType
          };
        }
        else {
          return {
            ...review,
            likes: reactionType === 'like' ? review.likes + 1 : review.likes,
            dislikes: reactionType === 'dislike' ? review.dislikes + 1 : review.dislikes,
            userReaction: reactionType
          };
        }
      }
      return review;
    }));
  };

  const handleAddReview = async () => {
    if (!comment || rating === 0) {
      alert('Please enter a comment and rating.');
      return;
    }

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert('You must be logged in to add a review.');
        return;
      }

      const userData = await getUserData(currentUser.uid);

      const reviewData = {
        comment,
        rating,
        userId: currentUser.uid,
        username: userData?.username || 'Anonymous',
        userImage: userData?.image || 'https://randomuser.me/api/portraits/men/1.jpg',
        createdAt: serverTimestamp(),
        likes: 0,
        dislikes: 0,
        userReaction: null
      };

      const reviewsRef = collection(db, 'products', productId, 'reviews');
      await addDoc(reviewsRef, reviewData);

      setComment('');
      setRating(0);
      setShowForm(false);

    } catch (error) {
      console.error('Error adding review: ', error);
      alert('Something went wrong while adding the review.');
    }
  };

  const renderStars = (value, size = 20) => (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          style={{
            fontSize: size,
            color: star <= value ? theme.starActive : theme.starInactive,
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
      <View style={styles(theme).ratingBarContainer}>
        <Text style={styles(theme).ratingBarLabel}>{starCount} star</Text>
        <View style={[styles(theme).ratingBarBackground, { backgroundColor: theme.barBg }]}>
          <View style={[styles(theme).ratingBarFill, { width: `${percentage}%`, backgroundColor: theme.barFill }]} />
        </View>
        <Text style={styles(theme).ratingBarCount}>{count}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={[styles(theme).container, { backgroundColor: theme.background }]}>
      <View style={[styles(theme).summaryContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
        <Text style={[styles(theme).averageRatingText, { color: theme.titleText }]}>Product Rating</Text>
        <View style={styles(theme).averageRatingContainer}>
          <Text style={[styles(theme).averageRating, { color: theme.titleText }]}>{averageRating.toFixed(1)}</Text>
          <View style={styles(theme).averageStars}>
            {renderStars(Math.round(averageRating), 24)}
            <Text style={[styles(theme).reviewCount, { color: theme.secondaryText }]}>{reviews.length} reviews</Text>
          </View>
        </View>

        <View style={styles(theme).distributionContainer}>
          {[5, 4, 3, 2, 1].map((starCount) => (
            <View key={`rating-${starCount}`}>
              {renderRatingBar(starCount, (reviews.filter(r => r.rating === starCount).length))}
            </View>
          ))}
        </View>
      </View>

      {reviews.map((review, index) => (
        <View key={review.id || index} style={[styles(theme).card, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
          <Image source={{ uri: review.userImage || 'https://via.placeholder.com/50' }} style={styles(theme).image} />
          <View style={styles(theme).textContainer}>
            <View style={styles(theme).reviewHeader}>
              <Text style={[styles(theme).username, { color: theme.primaryText }]}>{review.username}</Text>
              <Text style={[styles(theme).date, { color: theme.secondaryText }]}>
                {review.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Just now'}
              </Text>
            </View>
            <View style={styles(theme).ratingContainer}>
              {renderStars(review.rating)}
            </View>
            <Text style={[styles(theme).comment, { color: theme.accentText }]}>{review.comment}</Text>

            <View style={[styles(theme).helpfulContainer, { borderTopColor: theme.divider }]}>
              <Text style={[styles(theme).helpfulText, { color: theme.secondaryText }]}>Was this review helpful?</Text>
              <View style={styles(theme).reactionButtons}>
                <TouchableOpacity
                  style={[
                    styles(theme).reactionButton,
                    review.userReaction === 'like' && { borderColor: theme.helpfulLikeBorder, backgroundColor: theme.helpfulLikeBg }
                  ]}
                  onPress={() => handleReaction(review.id, 'like')}
                >
                  <Text style={[styles(theme).reactionText, { color: theme.primaryText }]}>👍 {review.likes || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles(theme).reactionButton,
                    review.userReaction === 'dislike' && { borderColor: theme.helpfulDislikeBorder, backgroundColor: theme.helpfulDislikeBg }
                  ]}
                  onPress={() => handleReaction(review.id, 'dislike')}
                >
                  <Text style={[styles(theme).reactionText, { color: theme.primaryText }]}>👎 {review.dislikes || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      ))}

      {!showForm && (
        <TouchableOpacity
          style={[styles(theme).addReviewButton, { backgroundColor: theme.addBtnBg }]}
          onPress={() => setShowForm(true)}
        >
          <Text style={[styles(theme).addReviewButtonText, { color: theme.addBtnText }]}>+ Add Your Review</Text>
        </TouchableOpacity>
      )}

      {showForm && (
        <View style={[styles(theme).formContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
          <Text style={[styles(theme).formTitle, { color: theme.titleText }]}>Write a Review</Text>
          <View style={styles(theme).starsContainer}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity key={num} onPress={() => setRating(num)}>
                <Text style={rating >= num ? [styles(theme).starSelected, { color: theme.starActive }] : [styles(theme).star, { color: theme.starInactive }]}>
                  {rating >= num ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles(theme).input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
            placeholder="Share your experience with this product..."
            placeholderTextColor={theme.inputPlaceholder}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
          />
          <View style={styles(theme).formButtons}>
            <TouchableOpacity
              style={[styles(theme).cancelButton, { backgroundColor: theme.cancelBtnBg }]}
              onPress={() => {
                setShowForm(false);
                setComment("");
                setRating(0);
              }}
            >
              <Text style={[styles(theme).cancelButtonText, { color: theme.cancelBtnText }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles(theme).submitButton, { backgroundColor: theme.submitBtnBg }]}
              onPress={handleAddReview}
            >
              <Text style={[styles(theme).submitButtonText, { color: theme.submitBtnText }]}>Submit</Text>
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
    flexDirection: "row",
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
  comment: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  helpfulContainer: { marginTop: 10, borderTopWidth: 1, paddingTop: 10 },
  helpfulText: { fontSize: 12, marginBottom: 5 },
  reactionButtons: { flexDirection: 'row' },
  reactionButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionText: { fontSize: 12, marginLeft: 5 },
  addReviewButton: { borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  addReviewButtonText: { fontSize: 16, fontWeight: '600' },
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
  starsContainer: { flexDirection: "row", marginBottom: 15, justifyContent: 'center' },
  star: { fontSize: 30, marginRight: 8 },
  starSelected: { fontSize: 30, marginRight: 8 },
  formButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  submitButton: { borderRadius: 8, padding: 14, flex: 1, marginLeft: 10, alignItems: 'center' },
  submitButtonText: { fontSize: 16, fontWeight: '600' },
  cancelButton: { borderRadius: 8, padding: 14, flex: 1, marginRight: 10, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
});

export default Review;