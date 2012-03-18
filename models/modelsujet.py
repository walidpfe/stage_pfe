from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import mail


class SujetModel(db.Model):
     sujetaddedby     = db.UserProperty(required=True)
     titresujet        = db.StringProperty()
     organisme         = db.StringProperty()
     description = db.TextProperty()
     sujetdateadded   = db.DateTimeProperty(auto_now_add=True)
   

class EncadreurSujetModel (db.Model):
  autreencadreur = db.StringProperty()
  sujet       = db.ReferenceProperty(SujetModel,
      collection_name = 'encadreur')
  @classmethod
  def getAllEmailsBySujetID(self,id):
    return EncadreurSujetModel.all().filter('sujet =',
        SujetModel.get_by_id(id))
  
class MotcleSujetModel (db.Model):
  motcle = db.StringProperty()
  sujet       = db.ReferenceProperty(SujetModel,
      collection_name = 'mot')


class NoteSujetModel(db.Model):
     creepar     = db.UserProperty(required=True)
     creedate   = db.DateTimeProperty(auto_now_add=True)
     texnote = db.TextProperty()
     sujet = db.ReferenceProperty(SujetModel,
     collection_name = 'sujetnote')