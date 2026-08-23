import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {getFunctions} from '../services/firebase';

const REQUIRED_COLUMNS = ['Brand', 'Silhouette', 'Name', 'Size', 'Color', 'Quantity'];
const OPTIONAL_COLUMNS = ['Release Date', 'Retail Value', 'Image'];

const ImportScreen = () => {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const {user} = useAuth();
  const [importing, setImporting] = useState(false);

  const handleChooseFile = () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to import items.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xls,.xlsx,.csv';
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const functionsInstance = getFunctions();
      if (!functionsInstance) {
        Alert.alert('Error', 'Cloud Functions are not available. Please check your Firebase configuration.');
        return;
      }

      setImporting(true);
      try {
        const fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] ?? '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const importCallable = functionsInstance.httpsCallable('importInventoryFromFile');
        const response = await importCallable({fileName: file.name, fileData});
        const result = response?.data as {imported?: number; skipped?: number} | undefined;
        const skippedNote = result?.skipped ? ` (${result.skipped} row(s) skipped)` : '';
        Alert.alert('Import Complete', `Imported ${result?.imported ?? 0} item(s)${skippedNote}.`, [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } catch (err: any) {
        console.error('importInventoryFromFile failed:', err);
        Alert.alert('Import Failed', err?.message ?? 'Please check your file and try again.');
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, {color: colors.text}]}>{'←'}</Text>
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
          <Text style={styles.primaryButtonText}>Choose File (CSV / Excel)</Text>
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
            <Text key={label} style={[styles.colLabel, {color: colors.text}]}>
              {'★'} {label}
            </Text>
          ))}

          <Text style={[styles.cardTitle, {color: colors.text, marginTop: 12}]}>Optional Columns</Text>
          {OPTIONAL_COLUMNS.map(label => (
            <Text key={label} style={[styles.colLabel, {color: colors.textSecondary}]}>
              {'○'} {label}
            </Text>
          ))}

          <Text style={[styles.formatNote, {color: colors.textSecondary}]}>
            Column order doesn't matter. Export your current vault to get the exact format.
          </Text>
        </View>
      </ScrollView>
    </View>
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
  backText: {fontSize: 22},
  headerTitle: {fontSize: 18, fontWeight: '700'},
  content: {flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48, maxWidth: 480, alignSelf: 'center', width: '100%'},

  title: {fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 24},

  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  buttonDisabled: {opacity: 0.6},
  primaryButtonText: {color: '#fff', fontSize: 16, fontWeight: '700'},

  importingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8},
  importingText: {fontSize: 14},

  card: {
    marginTop: 32,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5},
  colLabel: {fontSize: 15, marginBottom: 10},
  formatNote: {fontSize: 12, marginTop: 8, lineHeight: 16},
});

export default ImportScreen;
