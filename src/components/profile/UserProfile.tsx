import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Settings, Activity, Save, X, Camera, Bell, Shield, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, profile, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'activity'>('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    phone_number: profile?.phone_number || '',
    address: {
      street: profile?.address?.street || '',
      city: profile?.address?.city || '',
      state: profile?.address?.state || '',
      postal_code: profile?.address?.postal_code || '',
      country: profile?.address?.country || '',
    },
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: profile?.notification_preferences?.email_notifications ?? true,
    push_notifications: profile?.notification_preferences?.push_notifications ?? true,
    marketing_emails: profile?.notification_preferences?.marketing_emails ?? false,
    security_alerts: profile?.notification_preferences?.security_alerts ?? true,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profile_visibility: profile?.privacy_settings?.profile_visibility || 'private',
    show_email: profile?.privacy_settings?.show_email ?? false,
    show_phone: profile?.privacy_settings?.show_phone ?? false,
    data_sharing: profile?.privacy_settings?.data_sharing ?? false,
  });

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await updateProfile({
        full_name: profileData.full_name,
        username: profileData.username,
        phone_number: profileData.phone_number,
        address: profileData.address,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await updateProfile({
        notification_preferences: notificationSettings,
        privacy_settings: privacySettings,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Settings updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-slate-50 border-r border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Account</h2>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <nav className="p-4">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
                  {success}
                </div>
              )}
              
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {error}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-4">Profile Information</h3>
                    
                    {/* Profile Picture */}
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="relative">
                        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                          {profile?.profile_picture_url ? (
                            <img
                              src={profile.profile_picture_url}
                              alt="Profile"
                              className="w-20 h-20 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-8 w-8 text-slate-400" />
                          )}
                        </div>
                        <button className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors">
                          <Camera className="h-3 w-3" />
                        </button>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">{profile?.full_name || 'No name set'}</h4>
                        <p className="text-slate-500 text-sm">{user?.email}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileData.full_name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={profileData.username}
                          onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone_number}
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone_number: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-medium text-slate-900 mb-3">Address</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Street Address
                          </label>
                          <input
                            type="text"
                            value={profileData.address.street}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              address: { ...prev.address, street: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            value={profileData.address.city}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              address: { ...prev.address, city: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            State/Province
                          </label>
                          <input
                            type="text"
                            value={profileData.address.state}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              address: { ...prev.address, state: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            value={profileData.address.postal_code}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              address: { ...prev.address, postal_code: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Country
                          </label>
                          <input
                            type="text"
                            value={profileData.address.country}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              address: { ...prev.address, country: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-4">Account Settings</h3>
                    
                    {/* Notification Settings */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <Bell className="h-5 w-5 text-slate-600" />
                        <h4 className="font-medium text-slate-900">Notification Preferences</h4>
                      </div>
                      
                      <div className="space-y-3">
                        {[
                          { key: 'email_notifications', label: 'Email notifications' },
                          { key: 'push_notifications', label: 'Push notifications' },
                          { key: 'marketing_emails', label: 'Marketing emails' },
                          { key: 'security_alerts', label: 'Security alerts' },
                        ].map((setting) => (
                          <label key={setting.key} className="flex items-center justify-between">
                            <span className="text-slate-700">{setting.label}</span>
                            <input
                              type="checkbox"
                              checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                [setting.key]: e.target.checked
                              }))}
                              className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-slate-300 rounded"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <Shield className="h-5 w-5 text-slate-600" />
                        <h4 className="font-medium text-slate-900">Privacy Settings</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Profile Visibility
                          </label>
                          <select
                            value={privacySettings.profile_visibility}
                            onChange={(e) => setPrivacySettings(prev => ({
                              ...prev,
                              profile_visibility: e.target.value as 'public' | 'private'
                            }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          >
                            <option value="private">Private</option>
                            <option value="public">Public</option>
                          </select>
                        </div>
                        
                        {[
                          { key: 'show_email', label: 'Show email address' },
                          { key: 'show_phone', label: 'Show phone number' },
                          { key: 'data_sharing', label: 'Allow data sharing for improvements' },
                        ].map((setting) => (
                          <label key={setting.key} className="flex items-center justify-between">
                            <span className="text-slate-700">{setting.label}</span>
                            <input
                              type="checkbox"
                              checked={privacySettings[setting.key as keyof typeof privacySettings]}
                              onChange={(e) => setPrivacySettings(prev => ({
                                ...prev,
                                [setting.key]: e.target.checked
                              }))}
                              className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-slate-300 rounded"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{loading ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-4">Account Activity</h3>
                    
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-slate-600 text-center py-8">
                        Activity logs will appear here once you start using the platform.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}