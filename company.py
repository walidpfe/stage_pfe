from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import mail






class CompanyModel(db.Model):
     companyaddedby     = db.UserProperty(required=True)
     companyname        = db.StringProperty()
     companytel         = db.StringProperty()
     companymail        = db.StringProperty()
     companywebsite     = db.StringProperty()
     companyaddress     = db.StringProperty(multiline=True)
     companywilaya      = db.StringProperty()
     companydescription = db.StringProperty(multiline=True)
     companydateadded   = db.DateTimeProperty(auto_now_add=True)

