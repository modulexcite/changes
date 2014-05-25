from flask import current_app
from functools import wraps
from hashlib import md5

from changes.ext.redis import UnableToGetLock
from changes.config import redis


def lock(func):
    @wraps(func)
    def wrapped(**kwargs):
        key = '{0}:{1}'.format(
            func.__name__,
            md5(
                ('&'.join('{0}={1}'.format(k, repr(v))
                 for k, v in sorted(kwargs.items()))).encode('utf-8')
            ).hexdigest()
        )
        try:
            with redis.lock(key, timeout=1, expire=300, nowait=True):
                return func(**kwargs)
        except UnableToGetLock:
            current_app.logger.warn('Unable to get lock for %s', key)

    return wrapped
