import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { signOutUser } from "../../../Backend/Firebase/DBAPI";
import { useUserStore } from "../../../Backend/Zustand/UserStore";
import { darkTheme, lightTheme } from "../../../Theme/Tabs/ProfileTheme";
import MiniAlert from "../../GeneralComponent/MiniAlert";

const Profile = () => {
  const { user: userData, isLoggedIn } = useUserStore();
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');
  const [theme, setTheme] = useState(lightTheme);
  const [themeVersion, setThemeVersion] = useState(0);

  const updateTheme = useCallback(() => {
    let isActive = true;

    (async () => {
      try {
        const themeMode = await AsyncStorage.getItem("ThemeMode");
        const isDarkMode = themeMode === "2";
        const nextTheme = isDarkMode ? { ...darkTheme } : { ...lightTheme };

        if (isActive) {
          setTheme(() => nextTheme);
          setThemeVersion((value) => value + 1);
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(updateTheme);

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

  const handleSignOut = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        useUserStore.getState().logout();
        await AsyncStorage.removeItem("LoginID");
        showAlert("Successfully signed out", 'success');
        router.replace("./Home");
      } else {
        showAlert(result.error || "Failed to sign out", 'error');
      }
    } catch {
      showAlert("An error occurred while signing out", 'error');
    }
  };

  const themedScrollStyle = useMemo(() => [styles.container, theme.container], [theme]);

  return (
    <ScrollView
      key={themeVersion}
      style={themedScrollStyle}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
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
            {String(userData?.username).toUpperCase() === "UNDEFINED"
              ? "Please Login..."
              : userData?.username}
          </Text>
          <Text style={[styles.mail, theme.mail]}>
            {String(userData?.email).toLowerCase() === "undefined"
              ? "Please Login..."
              : String(userData?.email).toLowerCase()}
          </Text>
          <Text style={[styles.mail, theme.mail]}>{userData?.phone}</Text>
        </View>
        <TouchableOpacity
          style={styles.edit}
          onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/EditProfile"))}
          activeOpacity={0.4}
        >
          <Text style={[styles.edittext, theme.edittext]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Login button shown only when not logged in */}
      {!isLoggedIn && (
        <TouchableOpacity
          style={[styles.loginButton, theme.signoutButton]}
          onPress={() => router.push("../../Authentication/Login")}
          activeOpacity={0.7}
        >
          <Text style={[styles.signoutText, theme.signoutText]}>Login</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/Orders"))}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Orders</Text>
        <View style={[styles.arrow, theme.arrow]} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/Address"))}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Address</Text>
        <View style={[styles.arrow, theme.arrow]} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/Wishlist"))}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Wishlist</Text>
        <View style={[styles.arrow, theme.arrow]} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => router.push("../(ProfileTabs)/Help")}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Help & Support</Text>
        <View style={[styles.arrow, theme.arrow]} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profiletabs, theme.profiletabs]}
        onPress={() => router.push("../(ProfileTabs)/Settings")}
        activeOpacity={0.6}
      >
        <Text style={[styles.textb, theme.name]}>Settings</Text>
        <View style={[styles.arrow, theme.arrow]} />
      </TouchableOpacity>

      {isLoggedIn && (
        <TouchableOpacity
          style={[styles.signoutButton, theme.signoutButton]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={[styles.signoutText, theme.signoutText]}>Sign Out</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
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
  signoutButton: {
    width: "90%",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
    borderWidth: 1,
  },
  signoutText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  loginButton: {
    width: "90%",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 15,
    borderWidth: 1,
  },
});

export default Profile;
