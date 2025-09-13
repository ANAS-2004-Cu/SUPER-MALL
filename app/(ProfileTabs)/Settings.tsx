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

const Settings = () => {
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [theme, setTheme] = useState(lightTheme);

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
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <LinearGradient colors={theme.colors.gradient  as [string, string, ...string[]]} style={theme.styles.container}>
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
                            <SettingItem 
                                key={index} 
                                {...setting} 
                                theme={theme}
                            />
                        ))}
                    </View>
                </ScrollView>
            </LinearGradient>
        </>
    );
};

export default Settings;
