"""
Tests for UI mode API endpoint.
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class UiModeApiTests(TestCase):
    """Tests for /api/ui-mode/ endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin',
            password='pass',
            is_staff=True,
            is_superuser=True
        )
        self.regular_user = User.objects.create_user(
            username='regular',
            password='pass',
            is_staff=False,
            is_superuser=False
        )
    
    def test_authentication_required(self):
        """Test that authentication is required"""
        response = self.client.get('/api/ui-mode/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    @override_settings(MESSENGER_ONLY_DOMAINS=['ai.example.com'])
    def test_domain_not_in_messenger_list_returns_full_dashboard(self):
        """Test that non-messenger domains return FULL_DASHBOARD"""
        self.client.force_authenticate(user=self.regular_user)
        
        # Simulate request from non-messenger domain
        response = self.client.get(
            '/api/ui-mode/',
            HTTP_HOST='prs.example.com'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ui_mode'], 'FULL_DASHBOARD')
        self.assertEqual(response.data['username'], 'regular')
        self.assertFalse(response.data['is_staff'])
    
    @override_settings(MESSENGER_ONLY_DOMAINS=['ai.example.com'])
    def test_messenger_domain_non_admin_returns_messenger_only(self):
        """Test that non-admin users on messenger domain get MESSENGER_ONLY"""
        self.client.force_authenticate(user=self.regular_user)
        
        # Simulate request from messenger domain
        response = self.client.get(
            '/api/ui-mode/',
            HTTP_HOST='ai.example.com'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ui_mode'], 'MESSENGER_ONLY')
        self.assertEqual(response.data['username'], 'regular')
        self.assertFalse(response.data['is_staff'])
    
    @override_settings(MESSENGER_ONLY_DOMAINS=['ai.example.com'])
    def test_messenger_domain_admin_returns_full_dashboard(self):
        """Test that admin/staff users on messenger domain get FULL_DASHBOARD"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Simulate request from messenger domain
        response = self.client.get(
            '/api/ui-mode/',
            HTTP_HOST='ai.example.com'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ui_mode'], 'FULL_DASHBOARD')
        self.assertEqual(response.data['username'], 'admin')
        self.assertTrue(response.data['is_staff'])
    
    @override_settings(MESSENGER_ONLY_DOMAINS=['ai.example.com'])
    def test_messenger_domain_staff_returns_full_dashboard(self):
        """Test that staff users (non-superuser) on messenger domain get FULL_DASHBOARD"""
        staff_user = User.objects.create_user(
            username='staff',
            password='pass',
            is_staff=True,
            is_superuser=False
        )
        self.client.force_authenticate(user=staff_user)
        
        # Simulate request from messenger domain
        response = self.client.get(
            '/api/ui-mode/',
            HTTP_HOST='ai.example.com'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ui_mode'], 'FULL_DASHBOARD')
        self.assertEqual(response.data['username'], 'staff')
        self.assertTrue(response.data['is_staff'])
    
    @override_settings(MESSENGER_ONLY_DOMAINS=['ai.example.com'])
    def test_host_with_port_strips_port(self):
        """Test that host with port is correctly stripped"""
        self.client.force_authenticate(user=self.regular_user)
        
        # Simulate request with port
        response = self.client.get(
            '/api/ui-mode/',
            HTTP_HOST='ai.example.com:8000'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ui_mode'], 'MESSENGER_ONLY')
    
    @override_settings(MESSENGER_ONLY_DOMAINS=[])
    def test_empty_messenger_domains_list_returns_full_dashboard(self):
        """Test that empty messenger domains list always returns FULL_DASHBOARD"""
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get(
            '/api/ui-mode/',
            HTTP_HOST='any.domain.com'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ui_mode'], 'FULL_DASHBOARD')










