import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {getFunctions, getFirestore, getStorage} from '../services/firebase';

type ImportStatus =
  | 'idle'
  | 'reading'
  | 'validating'
  | 'preview'
  | 'processing'
  | 'complete'
  | 'failed';

interface ValidationResult {
  valid: boolean;
  rowCount: number;
  missing: string[];
  presentRequired: string[];
  presentOptional: string[];
  error?: string;
}

interface ImportJob {
  status: string;
  total: number;
  processed: number;
  currentItem: string;
  errors: {row: number; error: string}[];
  createdCount?: number;
  updatedCount?: number;
}

const COLUMN_LABELS: Record<string, string> = {
  brand: 'Brand',
  silhouette: 'Silhouette / Model',
  color: 'Color',
  styleId: 'Style ID',
  size: 'Size',
  quantity: 'Quantity',
  releaseDate: 'Release Date',
  retailValue: 'Retail Value / Price',
  imageUrl: 'Image URL',
};

const REQUIRED_KEYS = ['brand', 'silhouette', 'color'];
const OPTIONAL_KEYS = ['styleId', 'size', 'quantity', 'releaseDate', 'retailValue', 'imageUrl'];

const ImportScreen = () => {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const {user} = useAuth();

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [fileName, setFileName] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [fileBase64, setFileBase64] = useState('');
  const fileLocalUriRef = useRef('');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const db = getFirestore();
    if (!db) return;

    const unsub = db
      .collection('importJobs')
      .doc(jobId)
      .onSnapshot((snap: any) => {
        if (!snap?.exists) return;
        const data = snap.data();
        if (!data) return;
        setJob(data as ImportJob);
        if (data.status === 'complete') setStatus('complete');
        if (data.status === 'failed') setStatus('failed');
      });

    unsubscribeRef.current = unsub;
    return () => unsub();
  }, [jobId]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [
          DocumentPicker.types.xls,
          DocumentPicker.types.xlsx,
          DocumentPicker.types.csv,
        ],
        copyTo: 'cachesDirectory',
      });

      const pickedName = result.name || 'file';
      setFileName(pickedName);
      setStatus('reading');

      const localUri = result.fileCopyUri || result.uri;
      const cleanUri =
        Platform.OS === 'ios'
          ? decodeURIComponent(localUri.replace('file://', ''))
          : localUri;

      // Store local URI for later Storage upload (avoids large base64 in bridge)
      fileLocalUriRef.current = cleanUri;

      // Read as base64 only for the lightweight header validation call
      const base64Content = await RNFS.readFile(cleanUri, 'base64');
      setFileBase64(base64Content);
      setStatus('validating');

      const functions = getFunctions();
      if (!functions) throw new Error('Cloud Functions unavailable');

      const validateFn = functions.httpsCallable('validateImportFile');
      const res = await validateFn({fileContent: base64Content, fileName: pickedName});
      const v = res.data as ValidationResult;
      setValidation(v);
      setStatus('preview');
    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        setStatus('idle');
        return;
      }
      console.error('[Import] Pick/validate error:', err);
      setStatus('idle');
      Alert.alert('Error', err?.message || 'Failed to read file.');
    }
  };

  const handleStartImport = async () => {
    try {
      if (!user?.uid) throw new Error('Not authenticated');

      const storage = getStorage();
      if (!storage) throw new Error('Storage unavailable');
      const functions = getFunctions();
      if (!functions) throw new Error('Cloud Functions unavailable');

      const newJobId = `${user.uid}_${Date.now()}`;
      setJobId(newJobId);
      setStatus('processing');

      // Upload file to Storage using the base64 we already have from the validate step
      // putString avoids all URI/platform file-path issues
      if (!fileBase64) throw new Error('File not available. Please pick the file again.');
      const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
      const contentType =
        ext === 'csv' ? 'text/csv' :
        ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
        'application/vnd.ms-excel';
      const storagePath = `imports/${user.uid}/${newJobId}_${fileName}`;
      const storageRef = storage.ref(storagePath);
      await storageRef.putString(fileBase64, 'base64', {contentType});

      // Call the function with just the storage path
      const importFn = functions.httpsCallable('importInventory');
      importFn({jobId: newJobId, storagePath, fileName}).catch((err: any) => {
        console.error('[Import] Function error:', err);
        const isTimeout =
          err?.code === 'functions/deadline-exceeded' ||
          err?.message?.toLowerCase().includes('timeout') ||
          err?.message?.toLowerCase().includes('deadline');
        if (!isTimeout) {
          setStatus('failed');
          Alert.alert('Import Failed', err?.message || 'Something went wrong.');
        }
      });
    } catch (err: any) {
      console.error('[Import] Start error:', err);
      setStatus('preview');
      Alert.alert('Error', err?.message || 'Failed to start import.');
    }
  };

  const handleReset = () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    fileLocalUriRef.current = '';
    setStatus('idle');
    setJobId(null);
    setJob(null);
    setFileName('');
    setValidation(null);
    setFileBase64('');
  };

  const progress = job && job.total > 0 ? job.processed / job.total : 0;

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

        {/* ── IDLE ── */}
        {status === 'idle' && (
          <View style={styles.centerContainer}>
            <View style={[styles.iconCircle, {backgroundColor: colors.surfaceSecondary}]}>
              <Icon name="upload-file" size={48} color="#FF2D55" />
            </View>
            <Text style={[styles.title, {color: colors.text}]}>Import Your Collection</Text>
            <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
              Upload a CSV or Excel file to bulk-add items. Missing images will be auto-generated.
            </Text>

            <View style={[styles.card, {backgroundColor: colors.surfaceSecondary, borderColor: colors.border}]}>
              <Text style={[styles.cardTitle, {color: colors.text}]}>Required Columns</Text>
              {REQUIRED_KEYS.map(k => (
                <View key={k} style={styles.colRow}>
                  <Icon name="star" size={14} color="#FF2D55" />
                  <Text style={[styles.colLabel, {color: colors.text}]}>{COLUMN_LABELS[k]}</Text>
                </View>
              ))}
              <Text style={[styles.cardTitle, {color: colors.text, marginTop: 12}]}>Optional Columns</Text>
              {OPTIONAL_KEYS.map(k => (
                <View key={k} style={styles.colRow}>
                  <Icon name="radio-button-unchecked" size={14} color={colors.textSecondary} />
                  <Text style={[styles.colLabel, {color: colors.textSecondary}]}>{COLUMN_LABELS[k]}</Text>
                </View>
              ))}
              <Text style={[styles.formatNote, {color: colors.textSecondary}]}>
                Column order doesn't matter. Export your current vault to get the exact format.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handlePickFile}>
              <Icon name="folder-open" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Choose File</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── READING / VALIDATING ── */}
        {(status === 'reading' || status === 'validating') && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF2D55" style={styles.spinner} />
            <Text style={[styles.title, {color: colors.text}]}>
              {status === 'reading' ? 'Reading file…' : 'Checking columns…'}
            </Text>
            <Text style={[styles.subtitle, {color: colors.textSecondary}]}>{fileName}</Text>
          </View>
        )}

        {/* ── PREVIEW / VALIDATION RESULT ── */}
        {status === 'preview' && validation && (
          <View style={styles.centerContainer}>
            <View
              style={[
                styles.iconCircle,
                {backgroundColor: validation.valid ? '#34C75920' : '#FF2D5520'},
              ]}>
              <Icon
                name={validation.valid ? 'fact-check' : 'error-outline'}
                size={48}
                color={validation.valid ? '#34C759' : '#FF2D55'}
              />
            </View>

            <Text style={[styles.title, {color: colors.text}]}>
              {validation.valid ? 'Ready to Import' : 'Missing Required Columns'}
            </Text>
            <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
              {fileName}
              {validation.valid ? `  ·  ${validation.rowCount} rows detected` : ''}
            </Text>

            {/* Missing columns error */}
            {!validation.valid && validation.missing.length > 0 && (
              <View style={[styles.card, {backgroundColor: '#FF2D5510', borderColor: '#FF2D5540'}]}>
                <Text style={[styles.cardTitle, {color: '#FF2D55'}]}>
                  Cannot import — please fix your file
                </Text>
                {validation.missing.map(k => (
                  <View key={k} style={styles.colRow}>
                    <Icon name="cancel" size={16} color="#FF2D55" />
                    <View style={styles.colInfo}>
                      <Text style={[styles.colLabel, {color: '#FF2D55', fontWeight: '600'}]}>
                        {COLUMN_LABELS[k]} — column not found
                      </Text>
                      <Text style={[styles.colHint, {color: '#FF2D55'}]}>
                        Add a column named "{COLUMN_LABELS[k]}" to your file
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Column mapping preview */}
            <View style={[styles.card, {backgroundColor: colors.surfaceSecondary, borderColor: colors.border}]}>
              <Text style={[styles.cardTitle, {color: colors.text}]}>Column Mapping</Text>

              {REQUIRED_KEYS.map(k => {
                const found = validation.presentRequired.includes(k);
                return (
                  <View key={k} style={styles.colRow}>
                    <Icon
                      name={found ? 'check-circle' : 'cancel'}
                      size={18}
                      color={found ? '#34C759' : '#FF2D55'}
                    />
                    <View style={styles.colInfo}>
                      <Text style={[styles.colLabel, {color: colors.text}]}>
                        {COLUMN_LABELS[k]}
                        <Text style={{color: '#FF2D55'}}> *</Text>
                      </Text>
                      <Text style={[styles.colHint, {color: found ? '#34C759' : '#FF2D55'}]}>
                        {found ? 'Found' : 'Missing — required'}
                      </Text>
                    </View>
                  </View>
                );
              })}

              <View style={[styles.divider, {backgroundColor: colors.border}]} />

              {OPTIONAL_KEYS.map(k => {
                const found = validation.presentOptional.includes(k);
                return (
                  <View key={k} style={styles.colRow}>
                    <Icon
                      name={found ? 'check-circle' : 'radio-button-unchecked'}
                      size={18}
                      color={found ? '#34C759' : colors.textSecondary}
                    />
                    <View style={styles.colInfo}>
                      <Text style={[styles.colLabel, {color: found ? colors.text : colors.textSecondary}]}>
                        {COLUMN_LABELS[k]}
                      </Text>
                      <Text style={[styles.colHint, {color: found ? '#34C759' : colors.textSecondary}]}>
                        {found ? 'Found' : 'Not in file — will be skipped'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {validation.valid ? (
              <TouchableOpacity style={styles.primaryButton} onPress={handleStartImport}>
                <Icon name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  Start Import ({validation.rowCount} items)
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.primaryButton, {backgroundColor: colors.surfaceSecondary}]} onPress={handleReset}>
                <Icon name="folder-open" size={20} color={colors.text} />
                <Text style={[styles.primaryButtonText, {color: colors.text}]}>Choose a Different File</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
              <Text style={[styles.secondaryButtonText, {color: colors.textSecondary}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PROCESSING ── */}
        {status === 'processing' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF2D55" style={styles.spinner} />
            <Text style={[styles.title, {color: colors.text}]}>Importing items…</Text>
            <Text style={[styles.subtitle, {color: colors.textSecondary}]}>{fileName}</Text>

            {job && job.total > 0 ? (
              <>
                <View style={[styles.progressTrack, {backgroundColor: colors.surfaceSecondary}]}>
                  <View style={[styles.progressFill, {width: `${Math.round(progress * 100)}%`}]} />
                </View>
                <Text style={[styles.progressText, {color: colors.textSecondary}]}>
                  {job.processed} / {job.total} items
                </Text>
                {!!job.currentItem && (
                  <Text style={[styles.currentItem, {color: colors.text}]} numberOfLines={1}>
                    Adding: {job.currentItem}
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.progressText, {color: colors.textSecondary}]}>
                Preparing…
              </Text>
            )}
          </View>
        )}

        {/* ── COMPLETE ── */}
        {status === 'complete' && job && (
          <View style={styles.centerContainer}>
            <View style={[styles.iconCircle, {backgroundColor: '#34C75920'}]}>
              <Icon name="check-circle" size={56} color="#34C759" />
            </View>
            <Text style={[styles.title, {color: colors.text}]}>Import Complete!</Text>

            <View style={[styles.card, {backgroundColor: colors.surfaceSecondary, borderColor: colors.border}]}>
              <SummaryRow label="Total rows" value={String(job.total)} textColor={colors.text} secondaryColor={colors.textSecondary} />
              {job.createdCount != null || job.updatedCount != null ? (
                <>
                  {(job.createdCount ?? 0) > 0 && (
                    <SummaryRow label="New items added" value={String(job.createdCount)} textColor={colors.text} secondaryColor={colors.textSecondary} valueColor="#34C759" />
                  )}
                  {(job.updatedCount ?? 0) > 0 && (
                    <SummaryRow label="Existing items updated" value={String(job.updatedCount)} textColor={colors.text} secondaryColor={colors.textSecondary} valueColor="#007AFF" />
                  )}
                </>
              ) : (
                <SummaryRow label="Successfully imported" value={String(job.processed)} textColor={colors.text} secondaryColor={colors.textSecondary} />
              )}
              {job.errors.length > 0 && (
                <SummaryRow label="Rows skipped" value={String(job.errors.length)} textColor={colors.text} secondaryColor={colors.textSecondary} valueColor="#FF9500" />
              )}
            </View>

            {job.errors.length > 0 && (
              <View style={[styles.card, {backgroundColor: '#FF950010', borderColor: '#FF950040'}]}>
                <Text style={[styles.cardTitle, {color: '#FF9500'}]}>Skipped Rows</Text>
                {job.errors.slice(0, 5).map((e, i) => (
                  <Text key={i} style={[styles.colHint, {color: colors.textSecondary, marginBottom: 4}]}>
                    Row {e.row}: {e.error}
                  </Text>
                ))}
                {job.errors.length > 5 && (
                  <Text style={[styles.colHint, {color: colors.textSecondary}]}>
                    +{job.errors.length - 5} more
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryButtonText}>View My Vault</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
              <Text style={[styles.secondaryButtonText, {color: colors.textSecondary}]}>Import Another File</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FAILED ── */}
        {status === 'failed' && (
          <View style={styles.centerContainer}>
            <View style={[styles.iconCircle, {backgroundColor: '#FF2D5520'}]}>
              <Icon name="error-outline" size={56} color="#FF2D55" />
            </View>
            <Text style={[styles.title, {color: colors.text}]}>Import Failed</Text>
            <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
              {job?.errors?.[0]?.error || 'Something went wrong. Please try again.'}
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const SummaryRow = ({
  label,
  value,
  textColor,
  secondaryColor,
  valueColor,
}: {
  label: string;
  value: string;
  textColor: string;
  secondaryColor: string;
  valueColor?: string;
}) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.colLabel, {color: secondaryColor}]}>{label}</Text>
    <Text style={[styles.colLabel, {color: valueColor || textColor, fontWeight: '600'}]}>{value}</Text>
  </View>
);

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

  centerContainer: {alignItems: 'center', paddingTop: 32},
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8},
  subtitle: {fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24},
  spinner: {marginBottom: 24},

  card: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5},
  colRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10},
  colInfo: {flex: 1, marginLeft: 10},
  colLabel: {fontSize: 14},
  colHint: {fontSize: 12, marginTop: 1},
  formatNote: {fontSize: 12, marginTop: 12, lineHeight: 16},
  divider: {height: 1, marginVertical: 10},

  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {height: '100%', backgroundColor: '#FF2D55', borderRadius: 3},
  progressText: {fontSize: 14, marginBottom: 8},
  currentItem: {fontSize: 13, fontWeight: '500', textAlign: 'center'},

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  primaryButtonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  secondaryButton: {paddingVertical: 8},
  secondaryButtonText: {fontSize: 14},
});

export default ImportScreen;
