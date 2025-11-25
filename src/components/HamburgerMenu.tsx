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

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onMenuItemPress: (item: string) => void;
}

const HamburgerMenu = ({visible, onClose, onMenuItemPress}: HamburgerMenuProps) => {
  const insets = useSafeAreaInsets();
  const menuItems = [
    {id: 'profile', label: 'Profile', icon: 'person'},
    {id: 'privacy', label: 'Privacy Policy', icon: 'privacy-tip'},
    {id: 'terms', label: 'Terms and Conditions', icon: 'description'},
    {id: 'signout', label: 'Sign Out', icon: 'logout', isDanger: true},
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
            <Text style={styles.headerTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  item.isDanger && styles.dangerItem,
                  index < menuItems.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => handleMenuItemPress(item.id)}>
                <Icon
                  name={item.icon}
                  size={24}
                  color={item.isDanger ? '#FF3B30' : '#000000'}
                  style={styles.menuIcon}
                />
                <Text
                  style={[
                    styles.menuText,
                    item.isDanger && styles.dangerText,
                  ]}>
                  {item.label}
                </Text>
                <Icon
                  name="chevron-right"
                  size={20}
                  color={item.isDanger ? '#FF3B30' : '#999999'}
                />
              </TouchableOpacity>
            ))}
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  dangerItem: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dangerText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});

export default HamburgerMenu;

