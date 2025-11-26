#!/usr/bin/env python
"""Create a superuser non-interactively"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cfowise.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Check if superuser already exists
if User.objects.filter(is_superuser=True).exists():
    print("Superuser already exists. Skipping creation.")
else:
    # Create superuser
    username = 'admin'
    email = 'admin@example.com'
    password = 'admin123'
    
    if User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
        user.is_superuser = True
        user.is_staff = True
        user.set_password(password)
        user.save()
        print(f"✓ Updated existing user '{username}' to superuser")
    else:
        User.objects.create_superuser(username=username, email=email, password=password)
        print(f"✓ Created superuser: {username} (password: {password})")


