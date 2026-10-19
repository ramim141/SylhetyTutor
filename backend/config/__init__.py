"""SylhetyTutor Django configuration package."""

# Python 3.14+ compatibility patch for Django 5.1 template context copying.
# In Python 3.14, copy(super()) inside BaseContext.__copy__ returns a super proxy
# that lacks __dict__, causing AttributeError: 'super' object has no attribute 'dicts'
# when template tags (e.g. Django admin change_list_object_tools) invoke context.new().
try:
    from django.template import context as _django_context

    def _safe_basecontext_copy(self):
        duplicate = object.__new__(self.__class__)
        duplicate.__dict__.update(self.__dict__)
        duplicate.dicts = self.dicts[:]
        return duplicate

    _django_context.BaseContext.__copy__ = _safe_basecontext_copy
except Exception:
    pass
