import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
// Remove direct Firestore update imports
// import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ModernAlert from '../../components/Component/ModernAlert';
// Replace db/getCollection usage with centralized service
import { /* db, getCollection */ syncAvailableCategories, updateUserPreferredCategories } from '../../Firebase/Firebase';

const { width } = Dimensions.get('window');
const cardWidth = width / 2 - 20;

const CategorySelection = () => {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    primaryButtonText: 'OK',
    secondaryButtonText: '',
    onPrimaryPress: () => { },
    onSecondaryPress: () => { }
  });

  const [availableCategories, setAvailableCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const showAlert = (config) => {
    setAlertConfig(config);
    setAlertVisible(true);
  };

  // Remove: fetchProductsManage (moved to Firebase service)
  // ...existing code...

  useEffect(() => {
    (async () => {
      setLoadingCats(true);
      const { success, data: cats } = await syncAvailableCategories();
      if (success && cats.length > 0) {
        setAvailableCategories(cats);
      }
      setLoadingCats(false);
    })();
  }, []);

  const toggleCategory = (categoryName) => {
    if (selectedCategories.includes(categoryName)) {
      setSelectedCategories(selectedCategories.filter(cat => cat !== categoryName));
    } else {
      setSelectedCategories([...selectedCategories, categoryName]);
    }
  };

  const handleContinue = async () => {
    if (selectedCategories.length === 0) {
      showAlert({
        title: 'Notice',
        message: 'Please select at least one category',
        type: 'warning',
        primaryButtonText: 'OK',
      });
      return;
    }

    setLoading(true);
    try {
      if (userId) {
        // Centralized write
        const res = await updateUserPreferredCategories(String(userId), selectedCategories);
        if (!res.success) {
          throw new Error(res.error || 'Failed to save preferred categories');
        }
      }
      router.replace({
        pathname: '/(tabs)/home',
        params: { categories: JSON.stringify(selectedCategories) },
      });
    } catch (error) {
      console.error("Error saving preferred categories:", error);
      showAlert({
        title: 'Error',
        message: 'An error occurred while saving your preferences. Please try again.',
        type: 'error',
        primaryButtonText: 'OK',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Favorite Categories</Text>
        <Text style={styles.headerSubtitle}>
          Select categories you&apos;re interested in so we can provide personalized recommendations for you
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.categoriesContainer}>
          {loadingCats && availableCategories.length === 0 ? (
            <Text style={{ textAlign: 'center', width: '100%', color: '#666' }}>Loading categories...</Text>
          ) : availableCategories.length === 0 ? (
            <Text style={{ textAlign: 'center', width: '100%', color: '#666' }}>No categories available</Text>
          ) : (
            availableCategories.map((category) => (
              <TouchableOpacity
                key={category.id || category.name}
                style={[
                  styles.categoryCard,
                  selectedCategories.includes(category.name) && styles.selectedCard
                ]}
                onPress={() => toggleCategory(category.name)}
              >
                <View style={styles.imageContainer}>
                  <Image source={{ uri: category.image }} style={styles.categoryImage} />
                  {selectedCategories.includes(category.name) && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, selectedCategories.length === 0 && styles.disabledButton]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.continueButtonText}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
          {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 5 }} />}
        </TouchableOpacity>
      </View>

      <ModernAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        primaryButtonText={alertConfig.primaryButtonText}
        secondaryButtonText={alertConfig.secondaryButtonText}
        onPrimaryPress={alertConfig.onPrimaryPress}
        onSecondaryPress={alertConfig.onSecondaryPress}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

export default CategorySelection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: cardWidth,
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedCard: {
    borderColor: 'rgb(247, 207, 174)',
    borderWidth: 2,
    backgroundColor: '#FFF9F4',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    marginBottom: 10,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgb(247, 207, 174)',
    borderRadius: 12,
    padding: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: 'rgb(247, 207, 174)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ddd',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 15,
    padding: 10,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
});