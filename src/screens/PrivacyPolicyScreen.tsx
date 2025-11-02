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

const PrivacyPolicyScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Last Updated: January 1, 2024</Text>

        <View style={styles.section}>
          <Text style={styles.intro}>
            At Vault, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We may collect information about you in a variety of ways. The information we may collect via the Application includes:
          </Text>
          <Text style={styles.bulletPoint}>• Personal Data: Name, email address, and other contact information that you voluntarily give to us when registering or using the Application.</Text>
          <Text style={styles.bulletPoint}>• Shoe Collection Data: Information about your shoe collection, including brands, sizes, values, and images.</Text>
          <Text style={styles.bulletPoint}>• Device Information: Device identifiers, operating system, and device type.</Text>
          <Text style={styles.bulletPoint}>• Usage Data: Information about how you use the Application, including features accessed and interactions.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            We use the information we collect to:
          </Text>
          <Text style={styles.bulletPoint}>• Provide, maintain, and improve the Application;</Text>
          <Text style={styles.bulletPoint}>• Process and complete transactions;</Text>
          <Text style={styles.bulletPoint}>• Send you technical notices and support messages;</Text>
          <Text style={styles.bulletPoint}>• Respond to your comments and questions;</Text>
          <Text style={styles.bulletPoint}>• Monitor and analyze trends, usage, and activities in connection with the Application.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing and Disclosure</Text>
          <Text style={styles.sectionText}>
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy:
          </Text>
          <Text style={styles.bulletPoint}>• Service Providers: We may share your information with third-party vendors who perform services on our behalf;</Text>
          <Text style={styles.bulletPoint}>• Legal Requirements: We may disclose your information if required to do so by law or in response to valid requests by public authorities;</Text>
          <Text style={styles.bulletPoint}>• Business Transfers: If we are involved in a merger, acquisition, or sale of assets, your information may be transferred.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.sectionText}>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Privacy Rights</Text>
          <Text style={styles.sectionText}>
            Depending on your location, you may have the following rights regarding your personal information:
          </Text>
          <Text style={styles.bulletPoint}>• The right to access your personal information;</Text>
          <Text style={styles.bulletPoint}>• The right to correct inaccurate personal information;</Text>
          <Text style={styles.bulletPoint}>• The right to request deletion of your personal information;</Text>
          <Text style={styles.bulletPoint}>• The right to object to processing of your personal information;</Text>
          <Text style={styles.bulletPoint}>• The right to data portability.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Children's Privacy</Text>
          <Text style={styles.sectionText}>
            Our Application is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Changes to This Privacy Policy</Text>
          <Text style={styles.sectionText}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have questions or concerns about this Privacy Policy, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>Email: privacy@vaultapp.com</Text>
          <Text style={styles.contactInfo}>Address: 123 App Street, Tech City, TC 12345</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
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
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  intro: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginLeft: 16,
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 16,
    color: '#007AFF',
    lineHeight: 24,
    marginTop: 8,
    fontWeight: '500',
  },
});

export default PrivacyPolicyScreen;


