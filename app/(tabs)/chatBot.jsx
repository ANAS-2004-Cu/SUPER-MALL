import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { darkTheme, lightTheme } from '../../Theme/Tabs/ChatBotTheme';
import context from '../ChatBot/context';

const GOOGLE_API_KEY = 'AIzaSyDN0TUfk_ll_ADfxtCVByEzUsEPAiZhhvA';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`;

const suggestions = [
  "What's your return and exchange policy?",
  "Do you deliver to all provinces?",
  "Any deals or discounts right now?",
  "Can I track my order?",
  "What payment methods do you accept?",
  "What should I do if there's a problem with the product?",
  "Which products are on sale right now?"
];

export default function GeminiChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [theme, setTheme] = useState(lightTheme);
  const [appState, setAppState] = useState(AppState.currentState);

  // Function to check and update theme
  const checkTheme = async () => {
    const themeMode = await AsyncStorage.getItem("ThemeMode");
    setTheme(themeMode === "2" ? darkTheme : lightTheme);
  };

  useEffect(() => {
    // Initial theme fetch
    checkTheme();
    
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

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    try {
      const contents = [
        ...context.map(item => ({
          role: 'model',
          parts: [{ text: item.answer }]
        })),
        {
          role: 'user',
          parts: [{ text: input }]
        }
      ];

      const response = await axios.post(GEMINI_API_URL, {
        contents: contents
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const botReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

      setMessages([...updatedMessages, { role: 'assistant', content: botReply }]);
    } catch (error) {
      console.error('API Error:', error);
      setMessages([...updatedMessages, {
        role: 'assistant',
        content: 'Error connecting to Google Gemini'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionPress = (text) => {
    setInput(text);
    sendMessage();
  };

  const renderItem = ({ item }) => (
    <View style={[
      styles.messageRow,
      item.role === 'user' ? styles.userRow : styles.botRow
    ]}>
      {item.role === 'assistant' && (
        <FontAwesome5 name="robot" size={24} color={theme.robotIcon.color} />
      )}
      <View style={[
        styles.bubble,
        item.role === 'user' 
          ? [styles.userBubble, theme.userBubble] 
          : [styles.botBubble, theme.botBubble]
      ]}>
        <Text style={[styles.bubbleText, theme.bubbleText]}>{item.content}</Text>
      </View>
      {item.role === 'user' && (
        <Icon name="person-circle" size={24} color={theme.userIcon.color} style={styles.icon} />
      )}
    </View>
  );

  return (
    <View style={[styles.container, theme.container]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerText, theme.headerText]}>I&apos;m here for you, anytime!</Text>
      </View>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(_, idx) => idx.toString()}
        contentContainerStyle={styles.messagesContainer}
      />

      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionsList}>
            {suggestions.map((text, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSuggestionPress(text)}
                style={[styles.suggestionButton, theme.suggestionButton]}
              >
                <Text style={[styles.suggestionText, theme.suggestionText]}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.inputContainer, theme.inputContainer]}>
        <TextInput
          style={[styles.input, theme.input]}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          placeholderTextColor={theme === darkTheme ? "#8a8a8a" : "#757575"}
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.loader.color} />
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, theme.sendButton]}
            onPress={sendMessage}
            disabled={!input.trim()}
          >
            <Icon name="send" size={24} color={theme.sendIcon.color} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  icon: {
    marginHorizontal: 6,
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 200,
    marginBottom: 12
  },
  container: {
    flex: 1,
    padding: 16
  },
  messagesContainer: {
    paddingBottom: 16
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0
  },
  botBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0
  },
  bubbleText: {
    fontSize: 16
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    padding: 8,
    borderRadius: 24
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    borderRadius: 24,
    padding: 10,
  },
  loader: {
    marginHorizontal: 8,
  },
  suggestionsTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  suggestionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 6,
    marginBottom: 6
  },
  suggestionText: {
    fontSize: 14
  },
  headerContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  suggestionsContainer: {
    marginTop: 20,
    paddingBottom: 20,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
