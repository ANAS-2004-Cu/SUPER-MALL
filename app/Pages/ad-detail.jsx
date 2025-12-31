import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { darkTheme, lightTheme } from '../../Theme/Pages/AdDetailTheme';

const AdDetailScreen = () => {
    const { image, content } = useLocalSearchParams();
    const [decodedImage, setDecodedImage] = useState("");
    const [decodedContent, setDecodedContent] = useState("");
    const router = useRouter();
    const [theme, setTheme] = useState(lightTheme);
    const [themeVersion, setThemeVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [imageAspectRatio, setImageAspectRatio] = useState(1);
    const windowWidth = Dimensions.get('window').width;

    // Safely decode parameters on component mount
    useEffect(() => {
        try {
            if (image) {
                setDecodedImage(decodeURIComponent(image));
            }
        } catch (error) {
            console.log("Error decoding image URI:", error);
        }

        try {
            if (content) {
                setDecodedContent(decodeURIComponent(content));
            }
        } catch (error) {
            console.log("Error decoding content URI:", error);
        }
    }, [image, content]);

    // Get image dimensions to calculate proper aspect ratio
    useEffect(() => {
        if (decodedImage) {
            Image.getSize(
                decodedImage,
                (width, height) => {
                    setImageAspectRatio(width / height);
                },
                (error) => {
                    console.log("Error getting image size:", error);
                    setImageAspectRatio(16/9); // Default aspect ratio if we can't get the actual one
                }
            );
        }
    }, [decodedImage]);

    const checkTheme = useCallback(() => {
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
                console.log("Error loading theme:", error);
            }
        })();

        return () => {
            isActive = false;
        };
    }, []);

    useFocusEffect(checkTheme);

    // Calculate image height based on screen width and image aspect ratio
    const imageHeight = windowWidth / imageAspectRatio;

    // Get the appropriate back button color based on theme - inverted for contrast
    const backButtonColor = theme.isDark ? '#FFFFFF' : '#000000';

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: "Advertisement Details",
                    headerStyle: {
                        backgroundColor: theme.headerBackground,
                    },
                    headerTintColor: theme.headerTint,
                    headerShown: false,
                }}
            />
            <ScrollView 
                key={themeVersion}
                style={[styles.container, { backgroundColor: theme.background }]}
                contentContainerStyle={styles.contentContainer}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons 
                        name="arrow-back-circle-outline" 
                        size={40} 
                        color={backButtonColor}
                    />
                </TouchableOpacity>
                
                <View style={[
                    styles.imageContainer, 
                    { height: decodedImage ? Math.min(500, Math.max(200, imageHeight)) : 200 }
                ]}>
                    {decodedImage ? (
                        <>
                            <Image 
                                source={{ uri: decodedImage }}
                                style={styles.adImage}
                                onLoadStart={() => setLoading(true)}
                                onLoadEnd={() => setLoading(false)}
                                resizeMode="contain"
                            />
                            {loading && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="large" color={theme.loadingIndicator} />
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={[styles.noImageContainer, { backgroundColor: theme.cardBackground }]}>
                            <Icon name="image" size={50} color={theme.placeholderText} />
                            <Text style={[styles.noImageText, { color: theme.placeholderText }]}>
                                Image not available
                            </Text>
                        </View>
                    )}
                </View>
                
                <View style={[styles.contentSection, { backgroundColor: theme.cardBackground }]}>
                    {decodedContent ? (
                        <Text style={[styles.contentText, { color: theme.text }]}>
                            {decodedContent}
                        </Text>
                    ) : (
                        <Text style={[styles.noContentText, { color: theme.placeholderText }]}>
                            No additional information available for this advertisement.
                        </Text>
                    )}
                </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20,
        paddingTop: 30, // Add padding at the top to accommodate the back button
    },
    backButton: {
        position: 'absolute',
        left: 15,
        top: 35,
        zIndex: 10,
    },
    imageContainer: {
        width: '100%',
        position: 'relative',
        // Height is dynamically calculated based on image aspect ratio
    },
    adImage: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    noImageContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noImageText: {
        marginTop: 10,
        fontSize: 16,
        fontStyle: 'italic',
    },
    contentSection: {
        padding: 20,
        margin: 15,
        borderRadius: 10,
        elevation: 2,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    contentText: {
        fontSize: 16,
        lineHeight: 24,
    },
    noContentText: {
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
    },
});

export default AdDetailScreen;
