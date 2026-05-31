import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '791422035837-adc58e61kasqmbok93fql2eaonuudbua.apps.googleusercontent.com',
    offlineAccess: true,
  });
};