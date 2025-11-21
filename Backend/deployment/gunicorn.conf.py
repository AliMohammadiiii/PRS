"""
Gunicorn configuration file for CFOWise backend.
"""
import multiprocessing
import os

# Server socket
bind = "unix:/var/run/cfowise/gunicorn.sock"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "/var/log/cfowise/gunicorn-access.log"
errorlog = "/var/log/cfowise/gunicorn-error.log"
loglevel = os.environ.get("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "cfowise"

# Server mechanics
daemon = False
pidfile = "/var/run/cfowise/gunicorn.pid"
umask = 0
user = os.environ.get("GUNICORN_USER", "cfowise")
group = os.environ.get("GUNICORN_GROUP", "cfowise")
tmp_upload_dir = None

# SSL (if needed)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

# Performance
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# Graceful timeout for worker restart
graceful_timeout = 30




