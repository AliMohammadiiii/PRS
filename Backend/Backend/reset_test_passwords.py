#!/usr/bin/env python
"""Reset passwords for test users"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cfowise.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

for username in ['requestor_user', 'manager_user', 'finance_user']:
    try:
        u = User.objects.get(username=username)
        u.set_password('testpass123')
        u.save()
        print(f'✓ Reset password for {username}')
    except User.DoesNotExist:
        print(f'✗ User {username} not found')


