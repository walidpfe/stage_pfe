from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import mail
from models.userprofilemodel import UserProfileModel
from models.company import CompanyModel 
class PersonModel(db.Model):
     personaddedby     = db.UserProperty(required=True)
     personname        = db.StringProperty()
     personpname        = db.StringProperty()
     organisme           = db.ReferenceProperty(CompanyModel, collection_name = 'personorganisme')
     fonction             = db.StringProperty()
     personwebsite     = db.StringProperty()
     personaddress     = db.StringProperty(multiline=True)
     personwilaya      = db.StringProperty()
     persondescription = db.TextProperty()
     persondateadded   = db.DateTimeProperty(auto_now_add=True)
     
     
class PersonTelModel(db.Model):
     persontel    = db.StringProperty()  
     person       = db.ReferenceProperty(PersonModel,
      collection_name = 'tel')
     @classmethod
     def getAllTelsByPersonID(self,id):
      return PersonTelModel.all().filter('person =',
        PersonModel.get_by_id(id))    
    
class PersonEmailsModel(db.Model):
  email    = db.StringProperty()  
  person       = db.ReferenceProperty(PersonModel,
      collection_name = 'emails')
  
  @classmethod
  def getAllEmailsByPersonID(self,id):
    return PersonEmailsModel.all().filter('person =',
    PersonModel.get_by_id(id)).order(
        'email').fetch(1000)

  @property
  def id_or_name(self):
    return self.key().id_or_name()

