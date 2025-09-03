import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { collection, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, auth, getUserData } from "../Firebase/Firebase";

const Review = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [showForm, setShowForm] = useState(false);

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

  const renderStars = (rating, size = 20) => {
    return (
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text
            key={star}
            style={{
              fontSize: size,
              color: star <= rating ? '#FFD700' : '#ddd',
            }}
          >
            {star <= rating ? '★' : '☆'}
          </Text>
        ))}
      </View>
    );
  };

  const renderRatingBar = (starCount, count) => {
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;

    return (
      <View style={styles.ratingBarContainer}>
        <Text style={styles.ratingBarLabel}>{starCount} star</Text>
        <View style={styles.ratingBarBackground}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.summaryContainer}>
        <Text style={styles.averageRatingText}>Product Rating</Text>
        <View style={styles.averageRatingContainer}>
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <View style={styles.averageStars}>
            {renderStars(Math.round(averageRating), 24)}
            <Text style={styles.reviewCount}>{reviews.length} reviews</Text>
          </View>
        </View>

        <View style={styles.distributionContainer}>
          {[5, 4, 3, 2, 1].map((starCount) => (
            <View key={`rating-${starCount}`}>
              {renderRatingBar(starCount, ratingDistribution[starCount])}
            </View>
          ))}
        </View>
      </View>

      {reviews.map((review, index) => (
        <View key={review.id || index} style={styles.card}>
          <Image source={{ uri: review.userImage || 'https://via.placeholder.com/50' }} style={styles.image} />
          <View style={styles.textContainer}>
            <View style={styles.reviewHeader}>
              <Text style={styles.username}>{review.username}</Text>
              <Text style={styles.date}>{review.createdAt?.toDate()?.toLocaleDateString() || 'Just now'}</Text>
            </View>
            <View style={styles.ratingContainer}>
              {renderStars(review.rating)}
            </View>
            <Text style={styles.comment}>{review.comment}</Text>

            <View style={styles.helpfulContainer}>
              <Text style={styles.helpfulText}>Was this review helpful?</Text>
              <View style={styles.reactionButtons}>
                <TouchableOpacity
                  style={[
                    styles.reactionButton,
                    review.userReaction === 'like' && styles.likeActive
                  ]}
                  onPress={() => handleReaction(review.id, 'like')}
                >
                  <Text style={styles.reactionText}>👍 {review.likes || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reactionButton,
                    review.userReaction === 'dislike' && styles.dislikeActive
                  ]}
                  onPress={() => handleReaction(review.id, 'dislike')}
                >
                  <Text style={styles.reactionText}>👎 {review.dislikes || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      ))}

      {!showForm && (
        <TouchableOpacity
          style={styles.addReviewButton}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.addReviewButtonText}>+ Add Your Review</Text>
        </TouchableOpacity>
      )}

      {showForm && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Write a Review</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity key={num} onPress={() => setRating(num)}>
                <Text style={rating >= num ? styles.starSelected : styles.star}>
                  {rating >= num ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Share your experience with this product..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowForm(false);
                setComment("");
                setRating(0);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAddReview}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  averageRatingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  averageRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  averageRating: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginRight: 15,
  },
  averageStars: {
    flex: 1,
  },
  reviewCount: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  distributionContainer: {
    marginTop: 10,
  },
  ratingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  ratingBarLabel: {
    width: 50,
    fontSize: 12,
    color: '#7f8c8d',
  },
  ratingBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  ratingBarCount: {
    width: 30,
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: "#2c3e50",
  },
  date: {
    fontSize: 12,
    color: "#95a5a6",
  },
  ratingContainer: {
    marginBottom: 8,
  },
  comment: {
    fontSize: 14,
    color: "#34495e",
    lineHeight: 20,
    marginBottom: 10,
  },
  helpfulContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  helpfulText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  reactionButtons: {
    flexDirection: 'row',
  },
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
  reactionText: {
    fontSize: 12,
    marginLeft: 5,
  },
  likeActive: {
    borderColor: '#2ecc71',
    backgroundColor: '#e8f8f0',
  },
  dislikeActive: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdedec',
  },
  addReviewButton: {
    backgroundColor: '#FAE5D3',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  addReviewButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: "#2c3e50",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: "#f8f9fa",
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 15,
    justifyContent: 'center',
  },
  star: {
    fontSize: 30,
    color: "#ddd",
    marginRight: 8,
  },
  starSelected: {
    fontSize: 30,
    color: "#FFD700",
    marginRight: 8,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitButton: {
    backgroundColor: '#FAE5D3',
    borderRadius: 8,
    padding: 14,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 14,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Review;