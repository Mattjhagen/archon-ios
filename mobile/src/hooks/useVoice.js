import { useState, useEffect, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import * as Speech from 'expo-speech'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { getElevenlabsKey, getElevenlabsVoice } from '../api/shaggoth'

export default function useVoice() {
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [available, setAvailable] = useState(false)
  
  const onResultRef = useRef(null)
  const onEndRef = useRef(null)
  const transcriptRef = useRef('')
  const soundRef = useRef(null)

  useEffect(() => {
    setAvailable(true)
  }, [])

  useSpeechRecognitionEvent('start', () => setListening(true))
  
  useSpeechRecognitionEvent('end', () => {
    setListening(false)
    if (onEndRef.current && transcriptRef.current) {
      onEndRef.current(transcriptRef.current)
    }
  })
  
  useSpeechRecognitionEvent('result', (event) => {
    // Just take the highest confidence result (the first one) instead of joining all alternatives
    const text = event.results[0]?.transcript || ''
    setTranscript(text)
    transcriptRef.current = text
    
    const isFinal = event.results[0]?.isFinal
    if (isFinal && onResultRef.current) {
      onResultRef.current(text)
    }
  })

  useSpeechRecognitionEvent('error', () => {
    setListening(false)
    if (onEndRef.current && transcriptRef.current) {
      onEndRef.current(transcriptRef.current)
    }
  })

  const startListening = useCallback(async (onResult, onEnd) => {
    onResultRef.current = onResult || null
    onEndRef.current = onEnd || null
    setTranscript('')
    transcriptRef.current = ''
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      if (!result.granted) {
        setListening(false)
        return
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      })
    } catch {
      setListening(false)
    }
  }, [])

  const stopListening = useCallback(async () => {
    try {
      ExpoSpeechRecognitionModule.stop()
    } catch {}
    setListening(false)
  }, [])

  const stopSpeaking = useCallback(async () => {
    Speech.stop()
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync()
        await soundRef.current.unloadAsync()
      } catch {}
      soundRef.current = null
    }
    setSpeaking(false)
  }, [])

  const speak = useCallback(async (text, onDoneCallback) => {
    if (!text) return
    
    await stopSpeaking()
    setSpeaking(true)

    const elevenlabsKey = getElevenlabsKey()
    const elevenlabsVoice = getElevenlabsVoice()

    const playNative = () => {
      Speech.speak(text, {
        language: 'en-US',
        pitch: 0.95,
        rate: Platform.OS === 'ios' ? 0.52 : 0.9,
        onDone: () => {
          setSpeaking(false)
          if (onDoneCallback) onDoneCallback()
        },
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      })
    }

    if (elevenlabsKey && elevenlabsVoice) {
      try {
        const uri = FileSystem.cacheDirectory + 'speech_temp.mp3'
        
        // Use FileSystem.downloadAsync to safely download the mp3 straight to disk (bypassing React Native blob limits)
        const downloadRes = await FileSystem.downloadAsync(
          `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoice}?output_format=mp3_44100_128`,
          uri,
          {
            httpMethod: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': elevenlabsKey,
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_turbo_v2_5',
            })
          }
        )

        if (downloadRes.status !== 200) {
          throw new Error('ElevenLabs API returned non-200 status')
        }

        const { sound } = await Audio.Sound.createAsync({ uri })
        soundRef.current = sound
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setSpeaking(false)
            if (onDoneCallback) onDoneCallback()
            sound.unloadAsync().catch(() => {})
            soundRef.current = null
          }
        })
        
        await sound.playAsync()
        return // Successfully played ElevenLabs
      } catch (err) {
        console.error('ElevenLabs error:', err)
        // Fall through to playNative() below
      }
    }

    // Fallback or Native
    playNative()
  }, [stopSpeaking])

  return {
    listening,
    speaking,
    transcript,
    available,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}
