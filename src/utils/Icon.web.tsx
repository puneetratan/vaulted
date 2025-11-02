// Simple icon component for web using Unicode/Emoji as fallback
import React from 'react';
import {Text, StyleSheet, TextStyle} from 'react-native';

const iconMap: {[key: string]: string} = {
  menu: '☰',
  search: '🔍',
  notifications: '🔔',
  add: '+',
  close: '✕',
  'file-download': '⬇',
  'filter-list': '☰',
  'arrow-back': '←',
  'arrow-forward': '→',
  delete: '🗑',
  edit: '✏️',
  photo: '📷',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}

const Icon = ({name, size = 24, color = '#000000', style}: IconProps) => {
  const icon = iconMap[name] || name;
  
  return (
    <Text style={[styles.icon, {fontSize: size, color}, style]}>
      {icon}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});

export default Icon;


