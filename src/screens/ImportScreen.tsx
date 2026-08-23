import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {getFunctions} from '../services/firebase';
import DriveSheetPickerModal, {DriveSheetFile} from '../components/DriveSheetPickerModal';

const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const REQUIRED_COLUMNS = ['Brand', 'Silhouette', 'Name', 'Size', 'Color', 'Quantity'];
const OPTIONAL_COLUMNS = ['Release Date', 'Retail Value', 'Image'];

const ImportScreen = () => {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const {user} = useAuth();

  const [importing, setImporting] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveSheetFile[]>([]);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);

  const runInventoryImport = async (
    functionName: 'importInventoryFromFile' | 'importInventoryFromDriveSheet',
    payload: Record<string, unknown>,
  ) => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to import items.');
      return;
    }

    const functionsInstance = getFunctions();
    if (!functionsInstance) {
      Alert.alert('Error', 'Cloud Functions are not available. Please check your Firebase configuration.');
      return;
    }

    setImporting(true);
    try {
      const importCallable = functionsInstance.httpsCallable(functionName);
      const response = await importCallable(payload);
      const result = response?.data as {imported?: number; skipped?: number} | undefined;
      const skippedNote = result?.skipped ? ` (${result.skipped} row(s) skipped)` : '';
      Alert.alert('Import Complete', `Imported ${result?.imported ?? 0} item(s)${skippedNote}.`, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (err: any) {
      console.error(`${functionName} failed:`, err);
      Alert.alert('Import Failed', err?.message ?? 'Please check your file and try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleChooseFile = async () => {
    try {
      const pickerResult = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.xls,
          DocumentPicker.types.xlsx,
          DocumentPicker.types.csv,
        ],
        copyTo: 'cachesDirectory',
      });

      const file = pickerResult[0];
      const filePath = (file.fileCopyUri || file.uri).replace('file://', '');
      const fileData = await RNFS.readFile(filePath, 'base64');

      await runInventoryImport('importInventoryFromFile', {
        fileName: file.name,
        fileData,
      });
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        return;
      }
      console.error('File import failed:', err);
      Alert.alert('Error', 'Failed to read the selected file.');
    }
  };

  const handleImportFromDriveSheet = async () => {
    try {
      // The native Google Sign-In session is separate from the Firebase Auth
      // session, so users who authenticated with Apple (or whose Google
      // session wasn't restored after an app restart) won't have a signed-in
      // GoogleSignin user yet. Establish one before requesting Drive scopes,
      // otherwise addScopes()/getTokens() fail with
      // "getTokens requires a user to be signed in".
      const hasGoogleSession = await GoogleSignin.hasPreviousSignIn();
      if (!hasGoogleSession) {
        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
        }
        await GoogleSignin.signIn();
      } else {
        try {
          await GoogleSignin.signInSilently();
        } catch (silentError) {
          console.warn('Silent Google sign-in failed, prompting interactively:', silentError);
          await GoogleSignin.signIn();
        }
      }

      try {
        await GoogleSignin.addScopes({scopes: [DRIVE_READONLY_SCOPE]});
      } catch (addScopesError: any) {
        // iOS raises GIDSignInErrorCodeScopesAlreadyGranted (-8) when the
        // Drive scope was already granted in a previous session — that's
        // not a failure, just proceed to fetch tokens with existing access.
        if (addScopesError?.code !== '-8') {
          throw addScopesError;
        }
      }
      const tokens = await GoogleSignin.getTokens();
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        Alert.alert('Error', 'Could not get Google Drive access. Please try signing in again.');
        return;
      }

      const query = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: 'files(id,name)',
        pageSize: '50',
        orderBy: 'modifiedTime desc',
      });
      const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, {
        headers: {Authorization: `Bearer ${accessToken}`},
      });
      if (!listResponse.ok) {
        let apiMessage = '';
        try {
          const errorBody = await listResponse.json();
          apiMessage = errorBody?.error?.message ?? '';
        } catch (parseError) {
          // Response body wasn't JSON — fall through to a status-based message.
        }
        console.error('Drive files.list failed:', listResponse.status, apiMessage);

        if (listResponse.status === 401) {
          throw new Error('Your Google session expired. Please try again to sign in and grant Drive access.');
        }
        if (listResponse.status === 403) {
          if (/disabled|has not been used/i.test(apiMessage)) {
            throw new Error('Google Drive access is not enabled for this app yet. Please contact support.');
          }
          throw new Error('Google Drive access was denied. Please try again and allow access to your Google Sheets.');
        }
        throw new Error(apiMessage || `Failed to list Google Sheets (status ${listResponse.status}).`);
      }
      const listData = await listResponse.json();
      const files: DriveSheetFile[] = listData?.files ?? [];

      if (files.length === 0) {
        Alert.alert('No Sheets Found', 'No Google Sheets were found in your Drive.');
        return;
      }

      setDriveAccessToken(accessToken);
      setDriveFiles(files);
      setShowDrivePicker(true);
    } catch (err: any) {
      console.error('Drive sheet listing failed:', err);
      Alert.alert('Error', err?.message ?? 'Failed to access Google Drive.');
    }
  };

  const handleDriveSheetSelected = async (file: DriveSheetFile) => {
    setShowDrivePicker(false);
    if (!driveAccessToken) {
      return;
    }

    try {
      const valuesResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/A1:Z1000`,
        {headers: {Authorization: `Bearer ${driveAccessToken}`}},
      );
      if (!valuesResponse.ok) {
        throw new Error('Failed to read the selected Google Sheet.');
      }
      const valuesData = await valuesResponse.json();
      const values = valuesData?.values ?? [];
      if (values.length < 2) {
        Alert.alert('Empty Sheet', 'This sheet has no data rows to import.');
        return;
      }

      await runInventoryImport('importInventoryFromDriveSheet', {values});
    } catch (err: any) {
      console.error('Drive sheet import failed:', err);
      Alert.alert('Import Failed', err?.message ?? 'Failed to import from Google Sheet.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Import Collection</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, {color: colors.text}]}>Import Your Collection</Text>

        <TouchableOpacity
          style={[styles.primaryButton, {backgroundColor: '#34C759'}, importing && styles.buttonDisabled]}
          onPress={handleChooseFile}
          disabled={importing}>
          <Icon name="folder-open" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Choose File (CSV / Excel)</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, {backgroundColor: colors.border}]} />
          <Text style={[styles.dividerText, {color: colors.textSecondary}]}>OR</Text>
          <View style={[styles.dividerLine, {backgroundColor: colors.border}]} />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, {backgroundColor: '#007AFF'}, importing && styles.buttonDisabled]}
          onPress={handleImportFromDriveSheet}
          disabled={importing}>
          <Icon name="insert-link" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Import from Google Sheets</Text>
        </TouchableOpacity>

        {importing && (
          <View style={styles.importingRow}>
            <ActivityIndicator color={colors.text} />
            <Text style={[styles.importingText, {color: colors.textSecondary}]}>Importing…</Text>
          </View>
        )}

        <View style={[styles.card, {backgroundColor: colors.surfaceSecondary, borderColor: colors.border}]}>
          <Text style={[styles.cardTitle, {color: colors.text}]}>Required Columns</Text>
          {REQUIRED_COLUMNS.map(label => (
            <View key={label} style={styles.colRow}>
              <Icon name="star" size={14} color="#FF2D55" />
              <Text style={[styles.colLabel, {color: colors.text}]}>{label}</Text>
            </View>
          ))}

          <Text style={[styles.cardTitle, {color: colors.text, marginTop: 12}]}>Optional Columns</Text>
          {OPTIONAL_COLUMNS.map(label => (
            <View key={label} style={styles.colRow}>
              <Icon name="radio-button-unchecked" size={14} color={colors.textSecondary} />
              <Text style={[styles.colLabel, {color: colors.textSecondary}]}>{label}</Text>
            </View>
          ))}

          <Text style={[styles.formatNote, {color: colors.textSecondary}]}>
            Column order doesn't matter. Export your current vault to get the exact format.
          </Text>
        </View>
      </ScrollView>

      <DriveSheetPickerModal
        visible={showDrivePicker}
        files={driveFiles}
        onSelect={handleDriveSheetSelected}
        onClose={() => setShowDrivePicker(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {width: 40, alignItems: 'flex-start'},
  headerTitle: {fontSize: 18, fontWeight: '700'},
  content: {flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48},

  title: {fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 24},

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  buttonDisabled: {opacity: 0.6},
  primaryButtonText: {color: '#fff', fontSize: 16, fontWeight: '700'},

  dividerRow: {flexDirection: 'row', alignItems: 'center', marginVertical: 20},
  dividerLine: {flex: 1, height: 1},
  dividerText: {marginHorizontal: 12, fontSize: 13, fontWeight: '600'},

  importingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8},
  importingText: {fontSize: 14},

  card: {
    marginTop: 32,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5},
  colRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10},
  colLabel: {fontSize: 15},
  formatNote: {fontSize: 12, marginTop: 8, lineHeight: 16},
});

export default ImportScreen;
