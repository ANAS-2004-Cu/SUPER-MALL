import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../Firebase/Firebase';
import { doc, updateDoc } from 'firebase/firestore';
import ModernAlert from '../components/ModernAlert';

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

  const showAlert = (config) => {
    setAlertConfig(config);
    setAlertVisible(true);
  };

  const categories = [
    { id: 1, name: "Mobile", image: "https://i.ibb.co/4ZhGCKn2/apple-iphone-16-pro-desert-1-3.jpg" },
    { id: 2, name: "Computers", image: "https://i.ibb.co/xqvrtNZD/zh449-1.jpg" },
    { id: 3, name: "TVs", image: "https://i.ibb.co/vvTrVWFD/tv556-1.jpg" },
    { id: 4, name: "Men", image: "https://i.ibb.co/RGzqBrwk/1.jpg" },
    { id: 5, name: "Women", image: "https://i.ibb.co/Kzr7MVxM/1.jpg" },
    { id: 6, name: "Kids", image: "https://i.ibb.co/20TYN7Lz/1.jpg" },
  ];

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
        await updateDoc(doc(db, "Users", userId), {
          preferredCategories: selectedCategories,
          createdAt: new Date(),
          onboardingComplete: true,
        });
      }
      console.log("Selected Categories:", selectedCategories);
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
          Select categories you're interested in so we can provide personalized recommendations for you
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
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
          ))}
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