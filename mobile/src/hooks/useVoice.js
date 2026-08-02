import { useState, useEffect, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import * as base64 from 'base64-js'
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

    if (elevenlabsKey && elevenlabsVoice) {
      try {
        const uri = FileSystem.cacheDirectory + 'speech_temp.mp3'
        
        // Fetch binary audio using standard fetch to support POST bodies safely
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoice}?output_format=mp3_44100_128`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenlabsKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2_5',
          })
        })

        if (!res.ok) {
          throw new Error('ElevenLabs API returned non-200 status: ' + res.status)
        }

        const arrayBuffer = await res.arrayBuffer()
        const base64Data = base64.fromByteArray(new Uint8Array(arrayBuffer))
        
        await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: FileSystem.EncodingType.Base64 })

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
      }
    }

    // No fallback, just finish
    setSpeaking(false)
    if (onDoneCallback) onDoneCallback()
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
