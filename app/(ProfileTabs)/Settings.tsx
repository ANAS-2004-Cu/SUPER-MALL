import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MiniAlert from "../../components/MiniAlert";

interface SettingItemProps {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    title: string;
    subtitle?: string;
    action?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
    color?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    action,
    showArrow = true,
    rightComponent,
    color = "#5D4037",
}) => {
    return (
        <TouchableOpacity
            style={styles.settingCard}
            onPress={action}
            activeOpacity={0.8}
            disabled={!action}
        >
            <View style={styles.settingIconContainer}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {rightComponent ||
                (showArrow && (
                    <Ionicons name="chevron-forward" size={20} color="#8D6E63" />
                ))}
        </TouchableOpacity>
    );
};

const Settings = () => {
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<"success" | "error">("success");

    // Load theme mode from AsyncStorage
    useEffect(() => {
        const loadThemeMode = async () => {
            try {
                const savedThemeMode = await AsyncStorage.getItem("ThemeMode");
                if (savedThemeMode) {
                    setDarkMode(savedThemeMode === "2");
                }
            } catch (error) {
                console.error("Error loading theme mode:", error);
            }
        };
        loadThemeMode();
    }, []);

    // Save theme mode to AsyncStorage
    const handleDarkModeToggle = async (value: boolean) => {
        try {
            const themeMode = value ? "2" : "1";
            await AsyncStorage.setItem("ThemeMode", themeMode);
            setDarkMode(value);
        } catch (error) {
            console.error("Error saving theme mode:", error);
        }
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
                    trackColor={{ false: "#D7CCC8", true: "#A5D6A7" }}
                    thumbColor={notifications ? "#4CAF50" : "#8D6E63"}
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
                    trackColor={{ false: "#D7CCC8", true: "#A5D6A7" }}
                    thumbColor={darkMode ? "#4CAF50" : "#8D6E63"}
                />
            ),
            showArrow: false,
        },
    ];

    return (
        <>
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <LinearGradient colors={["white", "#FFE4C4"]} style={styles.container}>
                {alertMsg && (
                    <MiniAlert
                        message={alertMsg}
                        type={alertType}
                        onHide={() => setAlertMsg(null)}
                    />
                )}

                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name="arrow-back-circle-outline"
                            size={36}
                            color="#5D4037"
                        />
                    </TouchableOpacity>
                    <Text style={styles.title}>Settings</Text>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* App Settings */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>App Settings</Text>
                        {appSettings.map((setting, index) => (
                            <SettingItem key={index} {...setting} />
                        ))}
                    </View>
                </ScrollView>
            </LinearGradient>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 15,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    backButton: {
        position: "absolute",
        left: 15,
        top: 55,
        zIndex: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: "600",
        color: "#4E342E",
        textAlign: "center",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    sectionContainer: {
        marginHorizontal: 15,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#5D4037",
        marginBottom: 12,
    },
    settingCard: {
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    settingIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FAE5D3",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 15,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#5D4037",
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
        color: "#8D6E63",
    },
});

export default Settings;
