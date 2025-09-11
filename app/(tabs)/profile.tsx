import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { AppState, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MiniAlert from "../../components/MiniAlert";
import { darkTheme, lightTheme } from "../../Theme/Tabs/ProfileTheme";

const Profile = () => {
  const [userData, setUserData] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');
  const [theme, setTheme] = useState(lightTheme);
  const [appState, setAppState] = useState(AppState.currentState);

  // Function to check and update theme
  const checkTheme = async () => {
    const themeMode = await AsyncStorage.getItem("ThemeMode");
    setTheme(themeMode === "2" ? darkTheme : lightTheme);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const userDataString = await AsyncStorage.getItem("UserObject");
      if (userDataString) {
        const data = JSON.parse(userDataString);
        setUserData(data);
        setIsLoggedIn(data !== "undefined");
      }
    };
    
    // Initial theme fetch
    checkTheme();
    fetchUserData();
    
    // Set up listeners for app state changes
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground - check theme
        checkTheme();
      }
      setAppState(nextAppState);
    });
    
    // Set up a periodic check for theme changes
    const themeCheckInterval = setInterval(checkTheme, 1000);
    
    // Clean up
    return () => {
      subscription.remove();
      clearInterval(themeCheckInterval);
    };
  }, [appState]);

  const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
    setAlertMsg(message);
    setAlertType(type);
  };

  const handleAuthenticatedAction = (action: () => void) => {
    if (!isLoggedIn) {
      showAlert("Please login to access this feature", 'error');
      return;
    }
    action();
  };

  return (
    <View style={[styles.container, theme.container]}>
      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
        />
      )}
      <Image
        source={
          userData?.image
            ? { uri: userData?.image }
            : { uri: "https://randomuser.me/api/portraits/men/1.jpg" }
        }
        style={styles.logo}
      />

      <View style={[styles.infobox, theme.infobox]}>
        <View style={styles.info}>
          <Text style={[styles.name, theme.name]}>
            {String(userData?.username).toUpperCase() == "UNDEFINED"
              ? "Please Login..."
              : userData?.username}
          </Text>
          <Text style={[styles.mail, theme.mail]}>
            {String(userData?.email).toLowerCase() == "undefined"
              ? "Please Login..."
              : String(userData?.email).toLowerCase()}
          </Text>
          <Text style={[styles.mail, theme.mail]}>{userData?.phone}</Text>
        </View>
        <TouchableOpacity
          style={styles.edit}
          onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/editprofile"))}
          activeOpacity={0.4}
        >
          <Text style={[styles.edittext, theme.edittext]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/orders"))}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Orders</Text>
        <View style={[styles.arrow, theme.arrow]}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/address"))}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Address</Text>
        <View style={[styles.arrow, theme.arrow]}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/Wishlist"))}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Wishlist</Text>
        <View style={[styles.arrow, theme.arrow]}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => router.push("../(ProfileTabs)/help")}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Help & Support</Text>
        <View style={[styles.arrow, theme.arrow]}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => router.push("../(ProfileTabs)/About")}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>About</Text>
        <View style={[styles.arrow, theme.arrow]}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={()  => router.push("../(ProfileTabs)/Settings")}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Settings</Text>
        <View style={[styles.arrow, theme.arrow]}></View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
  },
  profiletabs: {
    width: "90%",
    height: 53,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 8,
    marginBottom: 12,
    paddingLeft: 20,
    justifyContent: "center",
  },
  textb: {
    fontSize: 17,
    fontWeight: "bold",
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  infobox: {
    width: "90%",
    height: 80,
    borderRadius: 10,
    marginVertical: 20,
    flexDirection: "row",
    elevation: 1,
    padding: 4,
  },
  info: {
    flex: 1,
  },
  edit: {
    justifyContent: "center",
    paddingRight: 15,
  },
  edittext: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    borderWidth: 2,
    borderRadius: 10,
    borderStyle: "dashed",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
    marginLeft: 15,
  },
  mail: {
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 15,
  },
  arrow: {
    position: "absolute",
    right: 15,
    width: 10,
    height: 10,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    transform: [{ rotate: "-45deg" }],
  },
});

export default Profile;
