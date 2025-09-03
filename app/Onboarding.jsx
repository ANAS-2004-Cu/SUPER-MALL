import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, Dimensions, SafeAreaView, Animated } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    image: require('../assets/images/welcom.png'),
    title: 'Welcome to our store',
    subtitle: 'The best products at the best prices found here',
  },
  {
    id: '2',
    image: require('../assets/images/easy.png'),
    title: 'Shop with ease',
    subtitle: 'Discover thousands of products in one place and order with just a click',
  },
  {
    id: '3',
    image: require('../assets/images/delivery.png'),
    title: 'Fast delivery',
    subtitle: 'We deliver your order quickly and safely to your doorstep',
  },
  {
    id: '4',
    image: require('../assets/images/payment.png'),
    title: 'Secure payment',
    subtitle: 'Various and secure payment options for your convenience',
  },
];

const Slide = ({ item }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [item.id]);

  return (
    <Animated.View style={[styles.slide, { opacity: fadeAnim }]}>
      <Image source={item.image} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </Animated.View>
  );
};

const Onboarding = () => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromRegister = params.fromRegister === 'true';
  const userId = params.userId;

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentSlideIndex + 1) % slides.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentSlideIndex(nextIndex);
    }, 2000);
    return () => clearInterval(interval);
  }, [currentSlideIndex]);

  const updateCurrentSlideIndex = (e) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(currentIndex);
  };

  const goNextSlide = () => {
    const nextSlideIndex = currentSlideIndex + 1;
    if (nextSlideIndex < slides.length) {
      flatListRef.current.scrollToIndex({
        index: nextSlideIndex,
        animated: true,
      });
      setCurrentSlideIndex(nextSlideIndex);
    } else {
      handleDone();
    }
  };

  const skipSlides = () => {
    const lastIndex = slides.length - 1;
    flatListRef.current.scrollToIndex({
      index: lastIndex,
      animated: true,
    });
    setCurrentSlideIndex(lastIndex);
  };

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_complete', 'true');
      if (fromRegister && userId) {
        router.push({
          pathname: '/CategorySelection',
          params: { userId },
        });
      } else {
        router.replace('/Login');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const Footer = () => {
    return (
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentSlideIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {currentSlideIndex !== slides.length - 1 ? (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.button, styles.skipButton]}
                onPress={skipSlides}
              >
                <Text style={[styles.buttonText, styles.skipText]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.nextButton]}
                onPress={goNextSlide}
              >
                <Text style={styles.buttonText}>Next</Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#fff"
                  style={{ marginLeft: 5 }}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.getStartedButton]}
              onPress={handleDone}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item }) => <Slide item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialNumToRender={slides.length}
        maxToRenderPerBatch={slides.length}
        windowSize={slides.length}
      />
      <Footer />
    </SafeAreaView>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  slide: {
    width,
    height: height * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  image: {
    width: width * 0.8,
    height: width * 0.8,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    height: height * 0.3,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  indicator: {
    height: 10,
    width: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeIndicator: {
    backgroundColor: 'rgb(247, 207, 174)',
    width: 25,
  },
  buttonContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 5,
    minWidth: 120,
  },
  nextButton: {
    backgroundColor: '#000',
  },
  skipButton: {
    backgroundColor: '#f5f5f5',
  },
  getStartedButton: {
    backgroundColor: 'rgb(247, 207, 174)',
    paddingHorizontal: 40,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  skipText: {
    color: '#666',
  },
});