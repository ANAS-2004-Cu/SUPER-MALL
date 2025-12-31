import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MiniAlert from '../../components/Component/MiniAlert';
import { useUserStore } from '../../store/userStore';
import { darkTheme, lightTheme } from '../../Theme/Pages/CategorySelectionTheme';
import { updateUserData } from '../services/DBAPI.tsx';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2;

const CategorySelection = () => {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  const [availableCategories, setAvailableCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [theme, setTheme] = useState(lightTheme);
  const [themeVersion, setThemeVersion] = useState(0);

  const loadTheme = useCallback(() => {
    let isActive = true;
    (async () => {
      try {
        const themeMode = await AsyncStorage.getItem('ThemeMode');
        const isDarkMode = themeMode === '2';
        const nextTheme = isDarkMode ? { ...darkTheme } : { ...lightTheme };

        if (isActive) {
          setTheme(() => nextTheme);
          setThemeVersion((value) => value + 1);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(loadTheme);

  const showAlert = (message, type = 'error') => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  // Remove: fetchProductsManage (moved to Firebase service)
  // ...existing code...

  useEffect(() => {
    (async () => {
      try {
        const user = useUserStore.getState().user;
        setCurrentUserId(user?.uid || null);
      } catch {
        setCurrentUserId(null);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingCats(true);
      try {
        const manageData = await AsyncStorage.getItem('unUpadtingManageDocs');
        if (manageData) {
          const parsedData = JSON.parse(manageData);
          const categoriesArray = parsedData?.AvilableCategory || [];
          // Convert string format "name,url" to object format {name, image}
          const formattedCategories = categoriesArray.map((item, index) => {
            if (typeof item === 'string' && item.includes(',')) {
              const [name, image] = item.split(',');
              return {
                id: index.toString(),
                name: name.trim(),
                image: image.trim()
              };
            }
            return item; // If already an object, return as is
          });
          
          setAvailableCategories(formattedCategories);
        } else {
          setAvailableCategories([]);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
        setAvailableCategories([]);
      } finally {
        setLoadingCats(false);
      }
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
      showAlert('Please select at least one category', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (!currentUserId) {
        throw new Error('Missing user identifier');
      }

      const updateResult = await updateUserData(String(currentUserId), {
        preferredCategories: selectedCategories,
      });
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to save preferred categories');
      }

      // Update Zustand store with the new preferred categories
      const currentUser = useUserStore.getState().user;
      if (currentUser && currentUser.uid === currentUserId) {
        useUserStore.getState().setUser({
          ...currentUser,
          preferredCategories: selectedCategories,
        });
      }
    } catch (error) {
      console.error("Error saving preferred categories:", error);
      showAlert('An error occurred while saving your preferences. Please try again.', 'error');
    } finally {
      setLoading(false);
      router.replace('../(tabs)/home');
    }
  };

  return (
    <View style={[styles.container, theme.container]} key={themeVersion}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, theme.headerTitle]}>Choose Your Favorite Categories</Text>
        <Text style={[styles.headerSubtitle, theme.headerSubtitle]}>
          Select categories you&apos;re interested in so we can provide personalized recommendations for you
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.categoriesContainer}>
          {loadingCats && availableCategories.length === 0 ? (
            <Text style={[{ textAlign: 'center', width: '100%' }, theme.loadingText]}>Loading categories...</Text>
          ) : availableCategories.length === 0 ? (
            <Text style={[{ textAlign: 'center', width: '100%' }, theme.loadingText]}>No categories available</Text>
          ) : (
            availableCategories.map((category) => (
              <TouchableOpacity
                key={category.id || category.name}
                style={[
                  styles.categoryCard,
                  theme.categoryCard,
                  selectedCategories.includes(category.name) && { ...styles.selectedCard, ...theme.selectedCard }
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
                <Text style={[styles.categoryName, theme.categoryName]}>{category.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, theme.footer]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            theme.continueButton,
            selectedCategories.length === 0 && { ...styles.disabledButton, ...theme.disabledButton }
          ]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={[styles.continueButtonText, theme.continueButtonText]}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
          {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 5 }} />}
        </TouchableOpacity>
      </View>

      {alertVisible && (
        <MiniAlert
          message={alertMessage}
          type={alertType}
          onHide={() => setAlertVisible(false)}
        />
      )}
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
    marginBottom: 25,
    marginTop: 30,
    paddingHorizontal: 10,
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
    paddingBottom: 120,
    paddingTop: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: cardWidth,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: 'rgb(247, 207, 174)',
    borderWidth: 2.5,
    backgroundColor: '#FFF9F4',
    shadowOpacity: 0.2,
    elevation: 5,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    resizeMode: 'cover',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgb(247, 207, 174)',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 4,
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