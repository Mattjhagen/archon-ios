const fs = require('fs');
let code = fs.readFileSync('/Users/matty/archon-ios/mobile/src/hooks/useVoice.js', 'utf8');

const newSpeak = `  const speak = useCallback(async (text, onDoneCallback) => {
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
          \`https://api.elevenlabs.io/v1/text-to-speech/\${elevenlabsVoice}?output_format=mp3_44100_128\`,
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
  }, [stopSpeaking])`;

// Replace the speak function
code = code.replace(/  const speak = useCallback\(async \(text, onDoneCallback\) => \{[\s\S]*?\}, \[stopSpeaking\]\)/, newSpeak);

fs.writeFileSync('/Users/matty/archon-ios/mobile/src/hooks/useVoice.js', code);
