import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../contexts/ThemeContext';

const TermsScreen = () => {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={[styles.header, {backgroundColor: colors.header, borderBottomColor: colors.border}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Terms and Conditions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.lastUpdated, {color: colors.textSecondary}]}>Last Updated: {lastUpdated}</Text>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>1. Acceptance of Terms</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            By accessing and using the Vault application, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>2. Use License</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            Permission is granted to temporarily download one copy of the Vault application for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• modify or copy the materials;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• use the materials for any commercial purpose or for any public display;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• attempt to decompile or reverse engineer any software contained in the Vault application;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• remove any copyright or other proprietary notations from the materials.</Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>3. User Accounts</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>4. Privacy Policy</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            Your use of the Vault application is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>5. Prohibited Uses</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            You may not use our application:
          </Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• In any way that violates any applicable federal, state, local, or international law or regulation;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• To transmit, or procure the sending of, any advertising or promotional material without our prior written consent;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• To impersonate or attempt to impersonate the company, a company employee, another user, or any other person or entity.</Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>6. Disclaimer</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            The materials on the Vault application are provided on an 'as is' basis. Vault makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>7. Limitations</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            In no event shall Vault or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the Vault application.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>8. Revisions</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            Vault may revise these terms of service at any time without notice. By using this application, you are agreeing to be bound by the then current version of these terms of service.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>9. Contact Information</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            If you have any questions about these Terms and Conditions, please contact us at support@vaultapp.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  lastUpdated: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    marginLeft: 16,
    marginBottom: 8,
  },
});

export default TermsScreen;


