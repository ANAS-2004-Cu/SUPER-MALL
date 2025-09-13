import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { darkTheme, lightTheme } from '../../Theme/ProfileTabs/AboutTheme';

const teamMembers = [
  "👤 Ahmed ezz aldin khalil",
  "👤 Abdelrahman ahmed helmy",
  "👤 Bavly momtaz",
  "👤 Ramadan abdelnaser",
  "👤 Ahmed saeed",
  "👤 Anas gamal",
  "👤 Abdelrahman ehab",
  "👤 Abdallah ali khamis"
];

const AboutScreen = () => {
  const router = useRouter();
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    loadTheme();
    const intervalId = setInterval(loadTheme, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const loadTheme = async () => {
    try {
      const themeMode = await AsyncStorage.getItem('ThemeMode');
      setTheme(themeMode === "2" ? darkTheme : lightTheme);
    } catch (error) {
      console.error("Error reading theme from storage:", error);
      setTheme(lightTheme);
    }
  };

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
          onPress={() => router.back()}
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
        {teamMembers.map((member, index) => (
          <Text key={index} style={styles.teamMember}>{member}</Text>
        ))}
      </ScrollView>
    </LinearGradient>
  );
};

export default AboutScreen;