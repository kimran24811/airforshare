import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { uploadFile } from '../utils/mediaUpload';

interface Props {
  transactionId: string;
  photoUrls: string[];
  onUpdate: (urls: string[]) => void;
  readonly?: boolean;
}

export default function PhotoPicker({ transactionId, photoUrls, onUpdate, readonly }: Props) {
  const [uploading, setUploading] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    if (photoUrls.length >= 3) { Alert.alert('Limit reached', 'Max 3 photos per entry'); return; }
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow access in phone settings'); return; }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 1 });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG },
      );
      const path = `entries/${transactionId}/photos/${Date.now()}.jpg`;
      const url = await uploadFile(compressed.uri, path);
      onUpdate([...photoUrls, url]);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const showOptions = () => {
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera', onPress: () => pickImage(true) },
      { text: 'Gallery', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View>
      <Text style={s.label}>Photos ({photoUrls.length}/3)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photoUrls.map((url, i) => (
          <View key={i} style={s.photoBox}>
            <Image source={{ uri: url }} style={s.photo} />
            {!readonly && (
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => onUpdate(photoUrls.filter((_, j) => j !== i))}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {!readonly && photoUrls.length < 3 && (
          <TouchableOpacity style={s.addBtn} onPress={showOptions} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#2E7D32" />
              : <Text style={s.addText}>📷{'\n'}Add Photo</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontWeight: '600', marginBottom: 8, color: '#333' },
  photoBox: { position: 'relative', marginRight: 10 },
  photo: { width: 90, height: 90, borderRadius: 8 },
  removeBtn: {
    position: 'absolute', top: 3, right: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    width: 90, height: 90, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#C8E6C9', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F8E9',
  },
  addText: { color: '#2E7D32', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
