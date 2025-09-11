import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface HelpTopicItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  action?: () => void;
}

const HelpTopicItem: React.FC<HelpTopicItemProps> = ({ icon, title, subtitle, action }) => {
  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        style={styles.topicCard}
        onPress={action}
        activeOpacity={0.8}
      >
        <View style={styles.topicIconContainer}>
          <Ionicons name={icon} size={24} color="#5D4037" />
        </View>
        <View style={styles.topicContent}>
          <Text style={styles.topicTitle}>{title}</Text>
          <Text style={styles.topicSubtitle}>{subtitle}</Text>
          <View style={styles.viewDetailsContainer}>
            <Text style={styles.viewDetailsText}>View details</Text>
            <Ionicons name="chevron-forward" size={16} color="#795548" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const Help = () => {
  const contactMethods = [
    { icon: 'call', label: 'Call Us', color: '#66BB6A', action: () => Linking.openURL('tel:+201032672532') },
    { icon: 'mail', label: 'Email Us', color: '#7986CB', action: () => Linking.openURL('mailto:anslahga2@gmail.com') },
    { icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366', action: () => Linking.openURL('https://wa.me/201032672532') }
  ];

  const helpTopics = [
    { icon: 'person-outline', title: 'Account Information', subtitle: 'Manage your account, Update Data', route: './editprofile' },
    { icon: 'key-outline', title: 'Password & Login Issues', subtitle: 'Reset & Update Password', route: '../Authentication/ForgetPass' },
    { icon: 'location-outline', title: 'Address', subtitle: 'Manage your saved addresses', route: './address' },
    { icon: 'cube-outline', title: 'Orders & Tracking', subtitle: 'Track your order, shipping updates', route: './orders' }
  ];

  return (
    <>
      <Stack.Screen name="help" options={{ headerShown: false }} />
      <LinearGradient colors={['white', '#FFE4C4']} style={styles.container}>
        <View>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back-circle-outline" size={36} color="#5D4037" />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Help & Support</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.supportSummary}>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Ionicons name="information-circle" size={24} color="#6D4C41" />
                <Text style={styles.summaryText}>Help Center</Text>
              </View>
              <View style={styles.summarySeparator} />
              <View style={styles.summaryItem}>
                <Ionicons name="call" size={22} color="#388E3C" />
                <Text style={styles.summaryText}>24/7 Support</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>How can we help you?</Text>
          <View style={styles.topicsContainer}>
            {helpTopics.map((topic, index) => (
              <HelpTopicItem
                key={index}
                icon={topic.icon as React.ComponentProps<typeof Ionicons>['name']}
                title={topic.title}
                subtitle={topic.subtitle}
                action={() => router.push(topic.route as any)}
              />
            ))}
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Need more help?</Text>
            <View style={styles.contactOptions}>
              {contactMethods.map((method, index) => (
                <TouchableOpacity key={index} style={styles.contactOption} onPress={method.action}>
                  <View style={[styles.contactIconContainer, { backgroundColor: method.color }]}>
                    <Ionicons name={method.icon as React.ComponentProps<typeof Ionicons>['name']} size={24} color="white" />
                  </View>
                  <Text style={styles.contactOptionText}>{method.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.chatButtonContainer}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.replace('../(tabs)/ChatBot')}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="white" />
            <Text style={styles.chatButtonText}>Start Live Chat Support</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 55,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4E342E',
    textAlign: 'center',
  },
  supportSummary: {
    marginHorizontal: 15,
    marginBottom: 20,
    marginTop: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 15,
    color: '#5D4037',
    fontWeight: '500',
  },
  summarySeparator: {
    width: 1,
    height: '60%',
    backgroundColor: '#D7CCC8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4037',
    marginTop: 10,
    marginBottom: 12,
    marginLeft: 15,
  },
  topicsContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  topicCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topicIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FAE5D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  topicContent: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5D4037',
    marginBottom: 4,
  },
  topicSubtitle: {
    fontSize: 14,
    color: '#8D6E63',
    marginBottom: 8,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#795548',
    marginRight: 2,
  },
  faqItem: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#F8F8F8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqItemExpanded: {
    backgroundColor: '#EFEBE9',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  faqIcon: {
    marginRight: 10,
  },
  faqQuestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faqQuestion: {
    fontSize: 15,
    color: '#5D4037',
    flex: 1,
  },
  faqAnswerContainer: {
    backgroundColor: '#EFEBE9',
    paddingVertical: 12,
    paddingHorizontal: 15,
    paddingLeft: 42,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6D4C41',
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#5D4037',
    marginBottom: 15,
  },
  contactOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  contactOption: {
    alignItems: 'center',
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactOptionText: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '500',
  },
  contactDetailText: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 4,
  },
  chatButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
  },
  chatButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 28,
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default Help;