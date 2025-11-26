"""
Rate-limited authentication views to prevent brute force attacks.

In DEBUG mode we skip rate limiting to make local development and
manual testing (e.g. repeated logins with test users) smoother.
"""
from django.conf import settings
from django_ratelimit.core import is_ratelimited
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import Throttled


class RateLimitedTokenObtainPairView(TokenObtainPairView):
    """
    Rate-limited token obtain view.
    Limits to 5 attempts per 15 minutes per IP address in production.
    In DEBUG mode, rate limiting is disabled.
    """
    rate_limit_key = 'ip'
    rate_limit_rate = '5/15m'
    
    def dispatch(self, request, *args, **kwargs):
        # Disable rate limiting entirely in DEBUG to avoid blocking dev/testing
        if request.method == 'POST' and not getattr(settings, "DEBUG", False):
            if is_ratelimited(
                request=request,
                group='',
                fn=None,
                key=self.rate_limit_key,
                rate=self.rate_limit_rate,
                method=['POST'],
                increment=True
            ):
                raise Throttled(detail='Too many login attempts. Please try again later.')
        return super().dispatch(request, *args, **kwargs)


class RateLimitedTokenRefreshView(TokenRefreshView):
    """
    Rate-limited token refresh view.
    Limits to 10 attempts per 15 minutes per IP address in production.
    In DEBUG mode, rate limiting is disabled.
    """
    rate_limit_key = 'ip'
    rate_limit_rate = '10/15m'
    
    def dispatch(self, request, *args, **kwargs):
        if request.method == 'POST' and not getattr(settings, "DEBUG", False):
            if is_ratelimited(
                request=request,
                group='',
                fn=None,
                key=self.rate_limit_key,
                rate=self.rate_limit_rate,
                method=['POST'],
                increment=True
            ):
                raise Throttled(detail='Too many refresh attempts. Please try again later.')
        return super().dispatch(request, *args, **kwargs)


class RateLimitedTokenVerifyView(TokenVerifyView):
    """
    Rate-limited token verify view.
    Limits to 20 attempts per 15 minutes per IP address in production.
    In DEBUG mode, rate limiting is disabled.
    """
    rate_limit_key = 'ip'
    rate_limit_rate = '20/15m'
    
    def dispatch(self, request, *args, **kwargs):
        if request.method == 'POST' and not getattr(settings, "DEBUG", False):
            if is_ratelimited(
                request=request,
                group='',
                fn=None,
                key=self.rate_limit_key,
                rate=self.rate_limit_rate,
                method=['POST'],
                increment=True
            ):
                raise Throttled(detail='Too many verify attempts. Please try again later.')
        return super().dispatch(request, *args, **kwargs)

