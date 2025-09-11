import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { darkTheme, lightTheme } from '../../Theme/ProfileTabs/AboutTheme';

const AboutScreen = () => {
  const router = useRouter();
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    const getTheme = async () => {
      try {
        const themeMode = await AsyncStorage.getItem('ThemeMode');
        if (themeMode === "2") {
          setTheme(darkTheme);
        } else {
          setTheme(lightTheme);
        }
      } catch (error) {
        console.error("Error reading theme from storage:", error);
        setTheme(lightTheme); // Default to light theme on error
      }
    };
    
    getTheme();

    // Set up a listener to check for theme changes
    const intervalId = setInterval(getTheme, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Define styles dynamically based on the current theme
  const styles = StyleSheet.create({
    gradientContainer: {
      flex: 1,
    },
    container: {
      padding: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 10,
      color: theme.titleColor,
    },
    underline: {
      height: 3,
      backgroundColor: theme.underlineColor,
      width: '50%',
      alignSelf: 'center',
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 20,
      color: theme.sectionTitleColor,
    },
    text: {
      fontSize: 18,
      lineHeight: 26,
      color: theme.textColor,
      marginTop: 10,
    },
    bulletPoint: {
      fontSize: 18,
      color: theme.textColor,
      marginTop: 8,
      marginLeft: 10,
    },
    teamMember: {
      fontSize: 18,
      color: theme.teamMemberColor,
      marginTop: 5,
      fontWeight: '500',
    },
    backButton: {
      position: 'absolute',
      left: 15,
      top: 55,
      zIndex: 10,
    },
  });

  return (
    <LinearGradient
      colors={theme.gradientColors as [string, string, ...string[]]}
      style={styles.gradientContainer}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { router.back() }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back-circle-outline" size={36} color={theme.backButtonColor} />
        </TouchableOpacity>
        <Text style={styles.title}>About SuperMall</Text>
        <View style={styles.underline} />

        <Text style={styles.sectionTitle}>Welcome to SuperMall!</Text>
        <Text style={styles.text}>
          SuperMall is a modern e-commerce app that provides you with a seamless and fast shopping experience.
          Whether you&apos;re looking for the latest products, exclusive deals, or the best prices, we&apos;ve got you covered.
        </Text>

        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.text}>
          Our goal is to provide the best online shopping experience with high quality and excellent service,
          making shopping more enjoyable and accessible for everyone.
        </Text>

        <Text style={styles.sectionTitle}>Our Team</Text>
        <Text style={styles.teamMember}>👤 Ahmed ezz aldin khalil</Text>
        <Text style={styles.teamMember}>👤 Abdelrahman ahmed helmy</Text>
        <Text style={styles.teamMember}>👤 Bavly momtaz</Text>
        <Text style={styles.teamMember}>👤 Ramadan abdelnaser</Text>
        <Text style={styles.teamMember}>👤 Ahmed saeed</Text>
        <Text style={styles.teamMember}>👤 Anas gamal</Text>
        <Text style={styles.teamMember}>👤 Abdelrahman ehab</Text>
        <Text style={styles.teamMember}>👤 Abdallah ali khamis</Text>
      </ScrollView>
    </LinearGradient>
  );
};

export default AboutScreen;