import React from 'react';
import {Modal, View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../contexts/ThemeContext';

export interface DriveSheetFile {
  id: string;
  name: string;
}

interface DriveSheetPickerModalProps {
  visible: boolean;
  files: DriveSheetFile[];
  onSelect: (file: DriveSheetFile) => void;
  onClose: () => void;
}

const DriveSheetPickerModal = ({visible, files, onSelect, onClose}: DriveSheetPickerModalProps) => {
  const {colors} = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, {backgroundColor: colors.surface}]}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: colors.text}]}>Select a Google Sheet</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={files}
            keyExtractor={item => item.id}
            style={styles.list}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[styles.row, {borderColor: colors.border}]}
                onPress={() => onSelect(item)}>
                <Icon name="grid-on" size={22} color="#34C759" style={styles.rowIcon} />
                <Text style={[styles.rowText, {color: colors.text}]} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, {color: colors.text}]}>No Google Sheets found.</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowText: {
    fontSize: 16,
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
  },
});

export default DriveSheetPickerModal;
