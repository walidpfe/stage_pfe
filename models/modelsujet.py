from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import mail
from models.modelespace import EspaceModel
from models.userprofilemodel import UserProfileModel
from models.company import CompanyModel
class SujetModel(db.Model):
     sujetaddedby     = db.UserProperty(required=True)
     titresujet        = db.StringProperty()
     organismeref         = db.ReferenceProperty(CompanyModel, collection_name = 'sujetorganisme')
     etatdaffectation = db.StringProperty()
     etatdevalidation = db.StringProperty()
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
     profile     = db.ReferenceProperty(UserProfileModel,
     collection_name = 'sujetnotepar')
     creedate   = db.DateTimeProperty(auto_now_add=True)
     texnote = db.TextProperty()
     sujet = db.ReferenceProperty(SujetModel,
     collection_name = 'sujetnote')
     
class TagSujetModel(db.Model):
  name = db.StringProperty()
     
class SelectionSujetModel(db.Model):
  espace = db.ReferenceProperty(EspaceModel,
      collection_name = 'espacesujetselection')
  sujet = db.ReferenceProperty(SujetModel,
      collection_name = 'sujetselection')
  tag = db.ReferenceProperty(TagSujetModel,
      collection_name = 'tagsujetselection')
  selectedby     = db.UserProperty(required=True)
  dateselected   = db.DateTimeProperty(auto_now_add=True)
  
  
  @classmethod
  def getAllTagsForSujetInThisEspace(self,espaceid, companyid):
    espace = EspaceModel.get_by_id(espaceid)
    sujet = SujetModel.get_by_id(companyid)
    selectionsforsujet_query = SelectionSujetModel.all().filter('espace = ',espace).filter('sujet = ',sujet)
    selectionsforsujet = selectionsforsujet_query.fetch(1000)
    tags = list()
    for selection in selectionsforsujet:
      tags.append(selection.tag)

    return tags



  
