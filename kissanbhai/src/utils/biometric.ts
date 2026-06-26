import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticate(reason: string): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return true;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return true;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return true;
  }
}
