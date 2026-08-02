import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Clipboard from 'expo-clipboard'
import { colors, spacing, radius, fontSize } from '../theme/colors'
import Header from '../components/Header'
import PurchaseModal from '../components/PurchaseModal'
import useVoice from '../hooks/useVoice'
import * as api from '../api/shaggoth'

async function getSessionId() {
  let sid = await AsyncStorage.getItem('shaggoth_session')
  if (!sid) {
    sid = 'mobile-' + Math.random().toString(36).slice(2, 10)
    await AsyncStorage.setItem('shaggoth_session', sid)
  }
  return sid
}

function MicButton({ listening, onPress, available }) {
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (listening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
    }
  }, [listening, pulseAnim])

  if (!available) return null

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: listening ? colors.red : colors.surfaceCard,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: listening ? colors.red : colors.border,
        marginRight: spacing.sm,
        transform: [{ scale: pulseAnim }],
      }}>
        <Text style={{ fontSize: 20 }}>{listening ? '⏹' : '🎙'}</Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

function SpeakerButton({ speaking, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ marginLeft: spacing.xs }}>
      <View style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
        backgroundColor: speaking ? colors.primaryMuted : 'transparent',
      }}>
        <Text style={{ fontSize: 14, color: speaking ? colors.primary : colors.textDim }}>
          {speaking ? '🔊' : '🔈'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <TouchableOpacity 
      onPress={async () => {
        await Clipboard.setStringAsync(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }} 
      activeOpacity={0.7} 
      style={{ marginLeft: spacing.xs }}
    >
      <View style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
      }}>
        <Text style={{ fontSize: 14, color: copied ? colors.green : colors.textDim }}>
          {copied ? '✓' : '📋'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function MessageBubble({ item, isUser, prevUserText, voice }) {
  const [showHow, setShowHow] = useState(false)
  const [rating, setRating] = useState(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  
  const submitFeedback = async (verdict, sendComment = true) => {
    try {
      const sid = await getSessionId()
      await api.submitFeedback({
        question: prevUserText || '',
        verdict: verdict || rating,
        answer: item.text,
        source: item.source || 'pattern',
        note: sendComment ? comment : '',
        session_id: sid
      })
      setSubmitted(true)
    } catch (err) {
      console.warn('Feedback err:', err)
    }
  }

  const tags = []
  if (item.source && !['pattern', 'streaming', 'error'].includes(item.source))
    tags.push(item.source)
  if (item.flag && item.flag !== 'green')
    tags.push(item.flag.toUpperCase())

  return (
    <View style={{
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: spacing.md,
    }}>
      <View style={{
        maxWidth: '82%',
        backgroundColor: isUser ? colors.primary : colors.surfaceCard,
        borderRadius: radius.xl,
        borderBottomRightRadius: isUser ? radius.sm : radius.xl,
        borderBottomLeftRadius: isUser ? radius.xl : radius.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderWidth: isUser ? 0 : 1,
        borderColor: colors.border,
      }}>
        <Text style={{
          color: isUser ? colors.white : colors.text,
          fontSize: fontSize.lg,
          lineHeight: 22,
        }}>
          {item.text || (item.source === 'streaming' ? '...' : '')}
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.xs }}>
        {tags.length > 0 && (
          <Text style={{
            color: colors.textDim,
            fontSize: fontSize.xs,
            marginHorizontal: spacing.xs,
          }}>
            {tags.join(' · ')}
          </Text>
        )}
        {!isUser && item.text && item.source !== 'streaming' && (
          <>
            <CopyButton text={item.text} />
            <SpeakerButton
              speaking={voice.speaking}
              onPress={() => voice.speaking ? voice.stopSpeaking() : voice.speak(item.text)}
            />
            {!submitted && (
              <>
                <TouchableOpacity onPress={() => setRating('good')} style={{ marginLeft: spacing.sm, paddingHorizontal: spacing.xs }}>
                  <Text style={{ fontSize: 16, opacity: rating === 'good' ? 1 : 0.4 }}>👍</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRating('bad')} style={{ marginLeft: spacing.xs, paddingHorizontal: spacing.xs }}>
                  <Text style={{ fontSize: 16, opacity: rating === 'bad' ? 1 : 0.4 }}>👎</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>

      {!isUser && item.text && item.source !== 'streaming' && (
        <View style={{ marginTop: spacing.xs, width: '100%', paddingLeft: spacing.xs }}>
          <TouchableOpacity onPress={() => setShowHow(!showHow)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: colors.textDim }}>{showHow ? '▾' : '▸'} how it got that</Text>
          </TouchableOpacity>
          {showHow && (
            <View style={{ marginTop: 2, paddingLeft: spacing.sm, borderLeftWidth: 2, borderColor: colors.border, marginBottom: spacing.sm }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18 }}>
                source: {item.source || 'pattern'}{'\n'}
                mode: {item.mode || 'default'}
              </Text>
            </View>
          )}
        </View>
      )}

      {rating && !submitted && (
        <View style={{ 
          marginTop: spacing.sm, 
          width: '82%', 
          backgroundColor: colors.surfaceCard, 
          padding: spacing.sm, 
          borderRadius: radius.md, 
          borderWidth: 1, 
          borderColor: colors.border 
        }}>
          <TextInput 
            value={comment}
            onChangeText={setComment}
            placeholder="What was wrong? Which part, and what did you expect?"
            placeholderTextColor={colors.textDim}
            multiline
            style={{ 
              color: colors.text, 
              fontSize: fontSize.sm, 
              minHeight: 60, 
              marginBottom: spacing.sm,
              textAlignVertical: 'top'
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
            <TouchableOpacity onPress={() => submitFeedback(rating, true)} style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, marginRight: spacing.sm }}>
              <Text style={{ color: colors.white, fontSize: fontSize.sm, fontWeight: '600' }}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => submitFeedback(rating, false)} style={{ backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' }}>Just the rating</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

export default function ChatScreen({ onBack, assistMode, chatMode, research }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const [credits, setCredits] = useState(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const flatRef = useRef(null)
  const voice = useVoice()

  useEffect(() => {
    if (assistMode && voice.available) {
      voice.startListening((text) => {
        if (text) {
          setInput(text)
          setTimeout(() => sendWithText(text, true), 300)
        }
      })
    }
  }, [assistMode, voice.available])

  useEffect(() => {
    async function initUser() {
      const uid = await api.getUserId()
      setUserId(uid)
      try {
        const c = await api.getCredits(uid)
        setCredits(c)
      } catch (e) {
        console.warn('Failed to load credits:', e)
      }
    }
    initUser()
  }, [])

  const sendWithText = useCallback(async (text, isVoice = false) => {
    if (!text?.trim() || loading) return
    setInput('')
    const sid = await getSessionId()

    const userMsg = { id: Date.now().toString(), role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])

    const botId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: botId, role: 'assistant', text: '', source: 'streaming' }])
    setLoading(true)

    let fullReply = ''
    const options = {}
    if (chatMode) options.mode = chatMode
    if (research !== undefined) options.research = research
    if (userId) options.user_id = userId

    api.chatStream(text.trim(), sid,
      token => {
        fullReply += token
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, text: m.text + token } : m
        ))
      },
      meta => {
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, source: meta.source, flag: meta.flag } : m
        ))
        setLoading(false)
        if (isVoice && fullReply) {
          voice.speak(fullReply, () => {
            if (continuousVoiceRef.current) {
              startVoiceLoop()
            }
          })
        } else if (continuousVoiceRef.current) {
          startVoiceLoop()
        }
      },
      err => {
        if (err.includes('OUT_OF_CREDITS') || err.includes('402')) {
          setShowPurchaseModal(true)
          setMessages(prev => prev.filter(m => m.id !== botId))
        } else {
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, text: 'Error: ' + err, source: 'error' } : m
          ))
        }
        setLoading(false)
        if (continuousVoiceRef.current) startVoiceLoop()
      },
      options
    )
  }, [loading, voice, chatMode, research])

  const send = useCallback(() => sendWithText(input, false), [input, sendWithText])

  const continuousVoiceRef = useRef(false)

  const startVoiceLoop = useCallback(() => {
    if (!continuousVoiceRef.current) return
    
    voice.startListening(
      (text) => {
        if (text) setInput(text)
      },
      (finalText) => {
        if (!continuousVoiceRef.current) return
        if (finalText?.trim()) {
          setInput(finalText.trim())
          sendWithText(finalText.trim(), true)
        } else {
          // Silence timeout, just loop back to listening
          startVoiceLoop()
        }
      }
    )
  }, [voice, sendWithText])

  const handleMicPress = useCallback(() => {
    if (continuousVoiceRef.current || voice.listening || voice.speaking) {
      continuousVoiceRef.current = false
      voice.stopListening()
      voice.stopSpeaking()
    } else {
      continuousVoiceRef.current = true
      startVoiceLoop()
    }
  }, [voice, startVoiceLoop])

  const newChat = async () => {
    await AsyncStorage.removeItem('shaggoth_session')
    setMessages([])
    continuousVoiceRef.current = false
    voice.stopSpeaking()
    voice.stopListening()
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <Header
        title="Comms"
        onBack={onBack}
        rightContent={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {credits && (
              <TouchableOpacity onPress={() => setShowPurchaseModal(true)} style={{ marginRight: spacing.sm }}>
                <Text style={{ color: colors.cyan, fontSize: fontSize.sm, fontWeight: '600' }}>
                  💰 {credits.available}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={newChat} activeOpacity={0.7}>
              <View style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs + 2,
                borderRadius: radius.full,
                backgroundColor: colors.primaryMuted,
                borderWidth: 1,
                borderColor: colors.primaryBorder,
              }}>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' }}>
                  New Chat
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        }
      />

      {voice.listening && voice.transcript ? (
        <View style={{
          backgroundColor: colors.surfaceCard,
          borderBottomWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: colors.red, marginRight: spacing.md,
          }} />
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, flex: 1 }}
            numberOfLines={2}>
            {voice.transcript}
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, flexGrow: 1 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: spacing.md }}>{'👽'}</Text>
            <Text style={{
              color: colors.textDim,
              fontSize: fontSize.lg,
              textAlign: 'center',
            }}>
              Open a channel to Shaggoth
            </Text>
            {voice.available && (
              <Text style={{
                color: colors.textDim,
                fontSize: fontSize.sm,
                textAlign: 'center',
                marginTop: spacing.sm,
              }}>
                Tap the mic to speak
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <MessageBubble 
            item={item} 
            isUser={item.role === 'user'} 
            prevUserText={index > 0 ? messages[index - 1].text : ''} 
            voice={voice} 
          />
        )}
      />

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderColor: colors.border,
      }}>
        <MicButton
          listening={voice.listening}
          onPress={handleMicPress}
          available={voice.available}
        />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          placeholderTextColor={colors.textDim}
          multiline
          style={{
            flex: 1,
            backgroundColor: colors.inputBg,
            color: colors.text,
            borderRadius: radius.xl,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            fontSize: fontSize.lg,
            maxHeight: 100,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            marginRight: spacing.sm,
          }}
          onSubmitEditing={send}
          blurOnSubmit
        />
        <TouchableOpacity
          onPress={send}
          disabled={loading || !input.trim()}
          activeOpacity={0.7}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (loading || !input.trim()) ? 0.4 : 1,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Text style={{ color: colors.white, fontSize: 20, transform: [{ rotate: '45deg' }] }}>{'➤'}</Text>
          }
        </TouchableOpacity>
      </View>
      <PurchaseModal 
        visible={showPurchaseModal} 
        userId={userId}
        onClose={() => setShowPurchaseModal(false)}
        onPurchaseSuccess={async (amount) => {
          if (userId) {
            try {
              const c = await api.addCredits(userId, amount)
              setCredits(c)
            } catch (e) {
              console.warn('Failed to update credits post-purchase', e)
            }
          }
        }}
      />
    </KeyboardAvoidingView>
  )
}
