import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState } from "react";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; 

const initialnotifications = [
  {
    id: '1',
    title: '🎉 Welcome!',
    body: 'Start your shopping journey now!',
    screen: 'home',
    icon: '🎉',
    read: false,
  },
  {
    id: '2',
    title: '🛍️ New Products Added!',
    body: 'Check out our latest arrivals.',
    screen: 'products',
    icon: '🛍️',
    read: false,
  },
  {
    id: '3',
    title: '❓ Forgot Your Password?',
    body: 'Recover your account easily.',
    screen: 'ForgetPass',
    icon: '❓',
    read: false,
  },
  {
    id: '4',
    title: 'ℹ️ About Us',
    body: 'Learn more about our mission and team.',
    screen: 'About',
    icon: 'ℹ️',
    read: false,
  },
  {
    id: '5',
    title: '🔔 Special Offers!',
    body: 'Exclusive deals are waiting for you!',
    screen: 'products',
    icon: '🔔',
    read: false,
  },
  {
    id: '6',
    title: '📘 Follow Us on Facebook!',
    body: 'Stay updated with the latest news and offers.',
    screen: 'About',
    icon: '📘',
    read: false,
  },
  {
    id: '7',
    title: '📸 Follow Us on Instagram!',
    body: 'See our newest collections first.',
    screen: 'About',
    icon: '📸',
    read: false,
  },
  {
    id: '8',
    title: '🐦 Follow Us on Twitter!',
    body: 'Don’t miss our live updates and news.',
    screen: 'About',
    icon: '🐦',
    read: false,
  },
  {
    id: '9',
    title: '📩 Contact Support',
    body: 'Having an issue? Contact our support team.',
    screen: 'About',
    icon: '📩',
    read: false,
  },
  
];


const Notifications = () => {
  const navigation = useNavigation(); 
  const [notifications, setNotifications] = useState(initialnotifications || []);

  const handleNotificationPress = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen);
    }
    setNotifications((prev) => prev.filter((notif) => notif.id !== item.id));

  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        <Ionicons name='notifications-outline' size={22} /> Notifications
      </Text>
      <FlatList
        data={notifications || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleNotificationPress(item)}>
           <View style={[styles.notificationCard, item.read && styles.readNotification]}>
              <Text style={styles.title}>
                 {item.title}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>

          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notifications available.</Text>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  readNotification: {
    backgroundColor: '#e0e0e0',
  },
  
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#aaa',
  },
});

export default Notifications;