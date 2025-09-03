import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import context from '../context';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Icon from 'react-native-vector-icons/Ionicons';


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
        <FontAwesome5 name="robot" size={24} color="black" />
      )}
      <View style={[
        styles.bubble,
        item.role === 'user' ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={styles.bubbleText}>{item.content}</Text>
      </View>
      {item.role === 'user' && (
        <Icon name="person-circle" size={24} color="#444" style={styles.icon} />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>I'm here for you, anytime!</Text>
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
                style={styles.suggestionButton}
              >
                <Text style={styles.suggestionText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          placeholderTextColor="#757575"
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#FFAB91" />
        ) : (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={!input.trim()}
          >
            <Icon name="send" size={24} color="#FFFFFF" />
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
  }
  ,
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgb(124, 124, 124)',
    borderRadius: 200,
    marginBottom: 12
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  }
  ,
  container: {
    flex: 1,
    backgroundColor: 'ffffff',
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
    backgroundColor: "rgb(141, 141, 141)",
    borderBottomRightRadius: 0
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5e1d7',
    borderBottomLeftRadius: 0
  },
  bubbleText: {
    color: 'black',
    fontSize: 16
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 24
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
    color: '#212121'
  },
  sendButton: {
    backgroundColor: 'rgb(66, 64, 64)',
    borderRadius: 24,
    padding: 10,
  },
  loader: {
    marginHorizontal: 8,
    color: '#FFAB91',
  },
  suggestionsContainer: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#444',
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  suggestionButton: {
    backgroundColor: '#E0F2F1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 6,
    marginBottom: 6
  },
  suggestionText: {
    color: '#00796B',
    fontSize: 14
  }, headerContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
