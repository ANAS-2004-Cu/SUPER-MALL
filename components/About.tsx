import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
const AboutScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>About SuperMall</Text>
      <View style={styles.underline} />

      <Text style={styles.sectionTitle}>Welcome to SuperMall!</Text>
      <Text style={styles.text}>
        SuperMall is a modern e-commerce app that provides you with a seamless and fast shopping experience. 
        Whether you’re looking for the latest products, exclusive deals, or the best prices, we’ve got you covered.
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
  );
};

const styles = StyleSheet.create({
  container: {
    
    padding: 20,
    backgroundColor: '#FAE5D3', 
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#4A3222',
  },
  underline: {
    height: 3,
    backgroundColor: '#8B5E3C', 
    width: '50%',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#8B5E3C',
  },
  text: {
    fontSize: 18,
    lineHeight: 26,
    color: '#4A3222', 
    marginTop: 10,
  },
  bulletPoint: {
    fontSize: 18,
    color: '#4A3222',
    marginTop: 8,
    marginLeft: 10,
  },
  teamMember: {
    fontSize: 18,
    color: '#4A3222',
    marginTop: 5,
    fontWeight: '500',
  },
});

export default AboutScreen;