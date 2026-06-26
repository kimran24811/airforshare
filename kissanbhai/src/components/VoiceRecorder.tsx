import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { uploadFile } from '../utils/mediaUpload';

interface Props {
  transactionId: string;
  voiceNoteUrl?: string;
  onUpdate: (url: string | undefined) => void;
  readonly?: boolean;
}

export default function VoiceRecorder({ transactionId, voiceNoteUrl, onUpdate, readonly }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sound]);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Microphone permission needed'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.LOW,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
        },
        web: {},
      });
      setRecording(rec);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= 119) { stopRecording(rec); return s; }
          return s + 1;
        });
      }, 1000);
    } catch (e: any) {
      Alert.alert('Error starting recording', e.message);
    }
  };

  const stopRecording = async (rec?: Audio.Recording) => {
    const r = rec ?? recording;
    if (!r) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try {
      await r.stopAndUnloadAsync();
    } catch {}
    const uri = r.getURI();
    setRecording(null);
    if (!uri) return;
    setUploading(true);
    try {
      const path = `entries/${transactionId}/voice_${Date.now()}.m4a`;
      const url = await uploadFile(uri, path);
      onUpdate(url);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const togglePlay = async () => {
    if (!voiceNoteUrl) return;
    if (playing) {
      await sound?.stopAsync();
      setPlaying(false);
      return;
    }
    const { sound: s } = await Audio.Sound.createAsync({ uri: voiceNoteUrl });
    setSound(s);
    setPlaying(true);
    await s.playAsync();
    s.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) setPlaying(false);
    });
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View>
      <Text style={st.label}>Voice Note</Text>
      {voiceNoteUrl ? (
        <View style={st.row}>
          <TouchableOpacity
            style={[st.btn, { backgroundColor: playing ? '#C62828' : '#2E7D32', flex: 1 }]}
            onPress={togglePlay}
          >
            <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>
              {playing ? '⏹ Stop' : '▶ Play'}
            </Text>
          </TouchableOpacity>
          {!readonly && (
            <TouchableOpacity
              style={[st.btn, { backgroundColor: '#888', marginLeft: 8 }]}
              onPress={() => onUpdate(undefined)}
            >
              <Text style={{ color: '#fff' }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : !readonly ? (
        <View style={st.row}>
          {recording ? (
            <>
              <View style={st.recDot} />
              <Text style={{ marginLeft: 8, color: '#C62828', fontWeight: '600', flex: 1 }}>
                {fmt(seconds)} / 2:00
              </Text>
              <TouchableOpacity
                style={[st.btn, { backgroundColor: '#C62828' }]}
                onPress={() => stopRecording()}
                disabled={uploading}
              >
                {uploading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff' }}>⏹ Stop</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[st.btn, { backgroundColor: '#2E7D32' }]} onPress={startRecording}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>🎙 Record (max 2 min)</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={{ color: '#aaa', fontSize: 12 }}>No voice note</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontWeight: '600', marginBottom: 8, color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#C62828' },
});
