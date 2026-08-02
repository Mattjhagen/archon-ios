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
    const text = event.results.map(r => r.transcript).join(' ')
    setTranscript(text)
    transcriptRef.current = text
    
    const isFinal = event.results.some(r => r.isFinal)
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
    
    // Stop any current speaking
    await stopSpeaking()
    setSpeaking(true)

    const elevenlabsKey = getElevenlabsKey()
    const elevenlabsVoice = getElevenlabsVoice()

    if (elevenlabsKey && elevenlabsVoice) {
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoice}?output_format=mp3_44100_128`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenlabsKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2_5', // Lowest latency model
          }),
        })

        if (!response.ok) {
          throw new Error('ElevenLabs error')
        }

        const blob = await response.blob()
        const reader = new FileReader()
        
        reader.onload = async () => {
          try {
            const base64data = reader.result.split(',')[1]
            const uri = FileSystem.cacheDirectory + 'speech_temp.mp3'
            
            await FileSystem.writeAsStringAsync(uri, base64data, { 
              encoding: FileSystem.EncodingType.Base64 
            })
            
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
          } catch {
            // Fallback if audio fails to play
            setSpeaking(false)
            if (onDoneCallback) onDoneCallback()
          }
        }
        reader.readAsDataURL(blob)
        return
      } catch (err) {
        // Fallback to native on error
      }
    }

    // Native Fallback
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
