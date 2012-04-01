from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import mail
from models.modelespace import EspaceModel
from models.userprofilemodel import UserProfileModel
from models.company import CompanyModel
class TasksAboutModel(db.Model):
     profile     = db.ReferenceProperty(UserProfileModel, collection_name = 'tacheprofileorganisme')
     titretache        = db.StringProperty()
     organisme         = db.ReferenceProperty(CompanyModel, collection_name = 'tacheorganisme')
     etattache = db.BooleanProperty()
     tachepourdate     = db.StringProperty()
     sujetdateadded   = db.DateTimeProperty(auto_now_add=True)
   
