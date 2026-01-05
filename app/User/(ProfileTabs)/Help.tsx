import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useUserStore } from '../../../Backend/Zustand/UserStore';
import { darkTheme, lightTheme } from '../../../Theme/ProfileTabs/HelpTheme';
import MiniAlert from '../../GeneralComponent/MiniAlert';

interface HelpTopicItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  action?: () => void;
  theme: any;
}

const HelpTopicItem: React.FC<HelpTopicItemProps> = ({ icon, title, subtitle, action, theme }) => {
  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        style={[styles.topicCard, { backgroundColor: theme.cardBackground }]}
        onPress={action}
        activeOpacity={0.8}
      >
        <View style={[styles.topicIconContainer, { backgroundColor: theme.topicIconBackground }]}>
          <Ionicons name={icon} size={24} color={theme.iconColorPrimary} />
        </View>
        <View style={styles.topicContent}>
          <Text style={[styles.topicTitle, { color: theme.topicTitleColor }]}>{title}</Text>
          <Text style={[styles.topicSubtitle, { color: theme.topicSubtitleColor }]}>{subtitle}</Text>
          <View style={styles.viewDetailsContainer}>
            <Text style={[styles.viewDetailsText, { color: theme.viewDetailsTextColor }]}>View details</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.viewDetailsTextColor} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const Help = () => {
  const [theme, setTheme] = useState(lightTheme);
  const [themeVersion, setThemeVersion] = useState(0);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');
  const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
    setAlertMsg(message);
    setAlertType(type);
  };

  const loadThemePreference = useCallback(async () => {
    try {
      const themeMode = await AsyncStorage.getItem('ThemeMode');
      setTheme(themeMode === '2' ? { ...darkTheme } : { ...lightTheme });
      setThemeVersion((version) => version + 1);
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  }, []);

  const contactMethods = [
    { icon: 'call', label: 'Call Us', color: theme.callColor, action: () => Linking.openURL('tel:+201032672532') },
    { icon: 'mail', label: 'Email Us', color: theme.emailColor, action: () => Linking.openURL('mailto:anslahga2@gmail.com') },
    { icon: 'logo-whatsapp', label: 'WhatsApp', color: theme.whatsappColor, action: () => Linking.openURL('https://wa.me/201032672532') }
  ];

  const helpTopics = [
    { icon: 'person-outline', title: 'Account Information', subtitle: 'Manage your account, Update Data', route: '../(ProfileTabs)/EditProfile' },
    { icon: 'key-outline', title: 'Password & Login Issues', subtitle: 'Reset & Update Password', route: '../../Authentication/ForgetPass' },
    { icon: 'mail-outline', title: 'Change Email Address', subtitle: 'Not working, future update', route: '../Authentication/ChangeEmail' },
    { icon: 'location-outline', title: 'Address', subtitle: 'Manage your saved addresses', route: '../(ProfileTabs)/Address' },
    { icon: 'cube-outline', title: 'Orders & Tracking', subtitle: 'Track your order, shipping updates', route: '../(ProfileTabs)/Orders' }
  ];

  const handleHelpTopicPress = async (route: string) => {
    try {
      const isLoggedIn = useUserStore.getState().isLoggedIn;
      if (!isLoggedIn) {
        showAlert("Please login to access this feature.", 'error');
        return;
      }
    } catch {
      showAlert("Please login to access this feature.", 'error');
      return;
    }

    if (route === '../Authentication/ChangeEmail') {
      showAlert("This feature is not available yet.", 'error');
      return;
    }

    router.push(route as any);
  };

  useFocusEffect(
    useCallback(() => {
      loadThemePreference();
    }, [loadThemePreference])
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        key={`help-theme-${themeVersion}`}
        colors={theme.gradientColors as [string, string, ...string[]]}
        style={styles.container}
      >
        {alertMsg && (
          <MiniAlert
            message={alertMsg}
            type={alertType}
            onHide={() => setAlertMsg(null)}
          />
        )}
        <View>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back-circle-outline" size={36} color={theme.backButtonColor} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.title, { color: theme.titleColor }]}>Help & Support</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.supportSummary, { backgroundColor: theme.summarySectionBackground }]}>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Ionicons name="information-circle" size={24} color={theme.iconColorPrimary} />
                <Text style={[styles.summaryText, { color: theme.textPrimary }]}>Help Center</Text>
              </View>
              <View style={[styles.summarySeparator, { backgroundColor: theme.separatorColor }]} />
              <View style={styles.summaryItem}>
                <Ionicons name="call" size={22} color={theme.iconColorSuccess} />
                <Text style={[styles.summaryText, { color: theme.textPrimary }]}>24/7 Support</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>How can we help you?</Text>
          <View style={styles.topicsContainer}>
            {helpTopics.map((topic, index) => (
              <HelpTopicItem
                key={index}
                icon={topic.icon as React.ComponentProps<typeof Ionicons>['name']}
                title={topic.title}
                subtitle={topic.subtitle}
                action={() => handleHelpTopicPress(topic.route as any)}
                theme={theme}
              />
            ))}
          </View>

          <View style={[styles.contactSection, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.contactTitle, { color: theme.textPrimary }]}>Need more help?</Text>
            <View style={styles.contactOptions}>
              {contactMethods.map((method, index) => (
                <TouchableOpacity key={index} style={styles.contactOption} onPress={method.action}>
                  <View style={[styles.contactIconContainer, { backgroundColor: method.color }]}>
                    <Ionicons name={method.icon as React.ComponentProps<typeof Ionicons>['name']} size={24} color="white" />
                  </View>
                  <Text style={[styles.contactOptionText, { color: theme.textPrimary }]}>{method.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.chatButtonContainer}>
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: theme.chatButtonBackground }]}
            onPress={() => router.replace('../(MainTaps)/ChatBot')}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={theme.chatButtonTextColor} />
            <Text style={[styles.chatButtonText, { color: theme.chatButtonTextColor }]}>Start Live Chat Support</Text>
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
    textAlign: 'center',
  },
  supportSummary: {
    marginHorizontal: 15,
    marginBottom: 20,
    marginTop: 5,
    borderRadius: 15,
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
    fontWeight: '500',
  },
  summarySeparator: {
    width: 1,
    height: '60%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topicIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    marginBottom: 4,
  },
  topicSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 13,
    marginRight: 2,
  },
  contactSection: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 17,
    fontWeight: '600',
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
    fontWeight: '500',
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
    borderRadius: 28,
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default Help;