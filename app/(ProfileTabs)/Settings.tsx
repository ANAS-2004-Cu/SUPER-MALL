import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MiniAlert from "../../components/Component/MiniAlert";
import { auth, loadCachedPreferredCategories, syncAvailableCategories, updateUserPreferredCategories } from "../../Firebase/Firebase";
import { darkTheme, lightTheme } from "../../Theme/ProfileTabs/SettingsTheme";

interface SettingItemProps {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    title: string;
    subtitle?: string;
    action?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
    color?: string;
    theme: typeof lightTheme;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    action,
    showArrow = true,
    rightComponent,
    color,
    theme,
}) => {
    return (
        <TouchableOpacity
            style={theme.styles.settingCard}
            onPress={action}
            activeOpacity={0.8}
            disabled={!action}
        >
            <View style={theme.styles.settingIconContainer}>
                <Ionicons name={icon} size={24} color={color || theme.colors.icon} />
            </View>
            <View style={theme.styles.settingContent}>
                <Text style={theme.styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={theme.styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {rightComponent ||
                (showArrow && (
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
                ))}
        </TouchableOpacity>
    );
};

// تعريف نوع بيانات الفئة
type Category = {
    id: string;
    name: string;
};

const Settings = () => {
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [theme, setTheme] = useState(lightTheme);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [savingCategories, setSavingCategories] = useState<boolean>(false);
    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'error'>('error');
    const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
        setAlertMsg(message);
        setAlertType(type);
    };

    const loadThemeMode = async () => {
        try {
            const savedThemeMode = await AsyncStorage.getItem("ThemeMode");
            const isDarkMode = savedThemeMode === "2";
            setDarkMode(isDarkMode);
            setTheme(isDarkMode ? darkTheme : lightTheme);
        } catch (error) {
            setTheme(lightTheme);
        }
    };

    const handleDarkModeToggle = async (value: boolean) => {
        try {
            const themeMode = value ? "2" : "1";
            await AsyncStorage.setItem("ThemeMode", themeMode);
            setDarkMode(value);
            setTheme(value ? darkTheme : lightTheme);
        } catch (error) {
            console.error("Error saving theme mode:", error);
        }
    };

    const loadAvailableCategories = async () => {
        const { success, data: cats } = await syncAvailableCategories();
        if (success && cats.length > 0) {
            setAvailableCategories(cats as Category[]);
        }
    };

    const loadUserPreferredCategories = async () => {
        try {
            const cats = await loadCachedPreferredCategories();
            setSelectedCategories(cats);
        } catch {}
    };

    const openCategoryDropdown = async () => {
        // Check login state before opening dropdown
        try {
            const userJson = await AsyncStorage.getItem('UserObject');
            const isLoggedIn = !!auth.currentUser || (!!userJson && userJson !== "undefined");
            if (!isLoggedIn) {
                showAlert("Please login to choose preferred categories.", 'error');
                return;
            }
        } catch {
            showAlert("Please login to choose preferred categories.", 'error');
            return;
        }

        await loadAvailableCategories();
        await loadUserPreferredCategories();
        setShowDropdown((prev: boolean) => !prev);
    };

    const savePreferredCategories = async () => {
        if (!auth.currentUser) return;
        setSavingCategories(true);
        try {
            const res = await updateUserPreferredCategories(auth.currentUser.uid, selectedCategories);
            if (res.success) {
                setShowDropdown(false);
                showAlert("Saved successfully", "success");
            } else {
                showAlert(res.error || "Failed to save categories", "error");
            }
        } catch {
            showAlert("Failed to save categories", "error");
        }
        setSavingCategories(false);
    };

    const toggleCategory = (name: string) => {
        setSelectedCategories((prev: string[]) =>
            prev.includes(name) ? prev.filter((n: string) => n !== name) : [...prev, name]
        );
    };

    const appSettings = [
        {
            icon: "notifications-outline" as const,
            title: "Notifications",
            subtitle: "Manage notification preferences",
            rightComponent: (
                <Switch
                    value={notifications}
                    onValueChange={setNotifications}
                    trackColor={{ 
                        false: theme.colors.switch.track.inactive, 
                        true: theme.colors.switch.track.active 
                    }}
                    thumbColor={notifications ? 
                        theme.colors.switch.thumb.active : 
                        theme.colors.switch.thumb.inactive
                    }
                />
            ),
            showArrow: false,
        },
        {
            icon: "moon-outline" as const,
            title: "Dark Mode",
            subtitle: "Toggle dark theme",
            rightComponent: (
                <Switch
                    value={darkMode}
                    onValueChange={handleDarkModeToggle}
                    trackColor={{ 
                        false: theme.colors.switch.track.inactive, 
                        true: theme.colors.switch.track.active 
                    }}
                    thumbColor={darkMode ? 
                        theme.colors.switch.thumb.active : 
                        theme.colors.switch.thumb.inactive
                    }
                />
            ),
            showArrow: false,
        },
        {
            icon: "list-outline" as const,
            title: "Preferred Categories",
            subtitle: "Choose your favorite categories",
            action: openCategoryDropdown,
            showArrow: true,
        },
    ];

    useEffect(() => {
        loadThemeMode();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadThemeMode();
        }, [])
    );

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <LinearGradient colors={theme.colors.gradient  as [string, string, ...string[]]} style={theme.styles.container}>
                {alertMsg && (
                    <MiniAlert
                        message={alertMsg}
                        type={alertType}
                        onHide={() => setAlertMsg(null)}
                    />
                )}
                <View style={theme.styles.header}>
                    <TouchableOpacity
                        style={theme.styles.backButton}
                        onPress={() => router.back()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name="arrow-back-circle-outline"
                            size={36}
                            color={theme.colors.icon}
                        />
                    </TouchableOpacity>
                    <Text style={theme.styles.title}>Settings</Text>
                </View>

                <ScrollView
                    style={theme.styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={theme.styles.scrollContent}
                >
                    <View style={theme.styles.sectionContainer}>
                        <Text style={theme.styles.sectionTitle}>App Settings</Text>
                        {appSettings.map((setting, index) => (
                            <View key={index}>
                                <SettingItem 
                                    {...setting} 
                                    theme={theme}
                                />
                                {setting.title === "Preferred Categories" && showDropdown && (
                                    <View style={{                                        borderRadius: 14,
                                        padding: 18,
                                        marginTop: 8,
                                        marginBottom: 16,
                                        elevation: 2,
                                        shadowColor: "#000",
                                        shadowOpacity: 0.07,
                                        shadowRadius: 6,
                                        shadowOffset: { width: 0, height: 2 },
                                        borderWidth: 1,
                                        borderColor: "#e0e0e0",
                                    }}>
                                        <Text style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 12, color: theme.colors.icon || "#007AFF" }}>
                                            Select your preferred categories
                                        </Text>
                                        <ScrollView style={{ maxHeight: 200 }}>
                                            {availableCategories.map((cat: Category) => (
                                                <TouchableOpacity
                                                    key={cat.id}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        paddingVertical: 10,
                                                        borderBottomWidth: 1,
                                                        borderBottomColor: "#ececec",
                                                    }}
                                                    onPress={() => toggleCategory(cat.name)}
                                                >
                                                    <Ionicons
                                                        name={selectedCategories.includes(cat.name) ? "checkbox" : "square-outline"}
                                                        size={22}
                                                        color={selectedCategories.includes(cat.name) ? theme.colors.icon || "#007AFF" : "#bbb"}
                                                        style={{ marginRight: 12 }}
                                                    />
                                                    <Text style={{ fontSize: 15, color: theme.colors.text?.primary || "#333" }}>{cat.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
                                            <TouchableOpacity
                                                style={{
                                                    backgroundColor: theme.colors.icon || "#007AFF",
                                                    paddingVertical: 10,
                                                    paddingHorizontal: 22,
                                                    borderRadius: 8,
                                                    alignItems: "center",
                                                    marginRight: 8,
                                                    flexDirection: "row",
                                                }}
                                                onPress={savePreferredCategories}
                                                disabled={savingCategories}
                                            >
                                                {savingCategories && (
                                                    <Ionicons name="reload" size={18} color="#fff" style={{ marginRight: 6 }} />
                                                )}
                                                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                                                    {savingCategories ? "Saving..." : "Save"}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{
                                                    backgroundColor: "#eee",
                                                    paddingVertical: 10,
                                                    paddingHorizontal: 22,
                                                    borderRadius: 8,
                                                    alignItems: "center",
                                                }}
                                                onPress={() => setShowDropdown(false)}
                                            >
                                                <Text style={{ color: "#333", fontWeight: "bold", fontSize: 16 }}>
                                                    Cancel
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </LinearGradient>
        </>
    );
};

export default Settings;
