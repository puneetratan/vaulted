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

const PrivacyPolicyScreen = () => {
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
        <Text style={[styles.headerTitle, {color: colors.text}]}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.lastUpdated, {color: colors.textSecondary}]}>Last Updated: {lastUpdated}</Text>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.intro, {color: colors.textSecondary}]}>
            At Vault, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>1. Information We Collect</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            We may collect information about you in a variety of ways. The information we may collect via the Application includes:
          </Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Personal Data: Name, email address, and other contact information that you voluntarily give to us when registering or using the Application.</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Shoe Collection Data: Information about your shoe collection, including brands, sizes, values, and images.</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Device Information: Device identifiers, operating system, and device type.</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Usage Data: Information about how you use the Application, including features accessed and interactions.</Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>2. How We Use Your Information</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            We use the information we collect to:
          </Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Provide, maintain, and improve the Application;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Process and complete transactions;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Send you technical notices and support messages;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Respond to your comments and questions;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Monitor and analyze trends, usage, and activities in connection with the Application.</Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>3. Information Sharing and Disclosure</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy:
          </Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Service Providers: We may share your information with third-party vendors who perform services on our behalf;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Legal Requirements: We may disclose your information if required to do so by law or in response to valid requests by public authorities;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• Business Transfers: If we are involved in a merger, acquisition, or sale of assets, your information may be transferred.</Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>4. Data Security</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>5. Your Privacy Rights</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            Depending on your location, you may have the following rights regarding your personal information:
          </Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• The right to access your personal information;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• The right to correct inaccurate personal information;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• The right to request deletion of your personal information;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• The right to object to processing of your personal information;</Text>
          <Text style={[styles.bulletPoint, {color: colors.textSecondary}]}>• The right to data portability.</Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>6. Children's Privacy</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            Our Application is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>7. Changes to This Privacy Policy</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>8. Contact Us</Text>
          <Text style={[styles.sectionText, {color: colors.textSecondary}]}>
            If you have questions or concerns about this Privacy Policy, please contact us at:
          </Text>
          <Text style={[styles.contactInfo, {color: colors.primary}]}>Email: privacy@vaultapp.com</Text>
          <Text style={[styles.contactInfo, {color: colors.primary}]}>Address: 123 App Street, Tech City, TC 12345</Text>
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
  intro: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
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
  contactInfo: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    fontWeight: '500',
  },
});

export default PrivacyPolicyScreen;


