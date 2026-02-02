import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../contexts/ThemeContext';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onMenuItemPress: (item: string) => void;
}

const HamburgerMenu = ({visible, onClose, onMenuItemPress}: HamburgerMenuProps) => {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    overlayTouchable: {
      flex: 1,
    },
    drawerContainer: {
      width: '80%',
      maxWidth: 320,
      height: '100%',
      backgroundColor: colors.surfaceSecondary,
      shadowColor: '#000',
      shadowOffset: {width: 2, height: 0},
      shadowOpacity: 0.5,
      shadowRadius: 3.84,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },
    headerSpacer: {flex: 1},
    closeButton: {padding: 4},
    menuContainer: {flex: 1, paddingTop: 8},
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surfaceSecondary,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuIcon: {marginRight: 16},
    menuText: {flex: 1, fontSize: 16},
    signOutSpacer: {height: 40},
  });
  
  const menuItems = [
    {id: 'profile', label: 'My Profile', icon: 'person'},
    {id: 'terms', label: 'Terms & Conditions', icon: 'description'},
    {id: 'privacy', label: 'Privacy Policy', icon: 'privacy-tip'},
    {id: 'report', label: 'Report a Problem', icon: 'error-outline'},
  ];

  const handleMenuItemPress = (itemId: string) => {
    onMenuItemPress(itemId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.drawerContainer}>
          {/* Drawer Header */}
          <View style={[styles.header, {paddingTop: insets.top + 20}]}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => handleMenuItemPress(item.id)}>
                <Icon
                  name={item.icon}
                  size={24}
                  color={colors.text}
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, {color: colors.text}]}>
                  {item.label}
                </Text>
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
            
            {/* Sign Out */}
            <View style={styles.signOutSpacer} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('signout')}>
              <Icon
                name="exit-to-app"
                size={24}
                color={colors.text}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, {color: colors.text}]}>Sign Out</Text>
              <Icon
                name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Overlay to close drawer */}
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
};

export default HamburgerMenu;

