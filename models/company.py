from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import mail
from models.userprofilemodel import UserProfileModel

class CompanyModel(db.Model):
     companyaddedby     = db.UserProperty(required=True)
     companyname        = db.StringProperty()
     companywebsite     = db.StringProperty()
     companyaddress     = db.StringProperty(multiline=True)
     companywilaya      = db.StringProperty()
     companydescription = db.TextProperty()
     companydateadded   = db.DateTimeProperty(auto_now_add=True)
     @classmethod
     def getCompanyByName(self,name):
          if CompanyModel.all().filter('companyname = ',name).get():
               ref = CompanyModel.all().filter('companyname = ',name).get()
          else:
               ref = CompanyModel( companyaddedby  = users.get_current_user(),
                                   companyname = name).put()
          return ref

class CompanyTelModel(db.Model):
     companytel    = db.StringProperty()  
     company       = db.ReferenceProperty(CompanyModel,
      collection_name = 'tel')
     @classmethod
     def getAllTelsByCompanyID(self,id):
      return CompanyTelModel.all().filter('company =',
        CompanyModel.get_by_id(id))    
    
class CompanyEmailsModel(db.Model):
  email    = db.StringProperty()  
  company       = db.ReferenceProperty(CompanyModel,
      collection_name = 'emails')
  
  @classmethod
  def getAllEmailsByCompanyID(self,id):
    return CompanyEmailsModel.all().filter('company =',
        CompanyModel.get_by_id(id)).order(
        'email').fetch(1000)

  @property
  def id_or_name(self):
    return self.key().id_or_name()



class CompanyAddressesesModel(db.Model):
  companyaddress     = db.StringProperty(multiline=True)
  companywilaya      = db.StringProperty()
  company       = db.ReferenceProperty(CompanyModel,
      collection_name = 'addresses')


  @classmethod
  def getAll(self):
    return CompanyAddressesesModel.all().filter('company =',
        self.getCompany()).order(
        'companywilaya').fetch(1000)

  @property
  def id_or_name(self):
    return self.key().id_or_name()


class NoteCompanyModel(db.Model):
     profile     = db.ReferenceProperty(UserProfileModel,
     collection_name = 'entreprisenotepar')
     creedate   = db.DateTimeProperty(auto_now_add=True)
     texnote = db.TextProperty()
     company     = db.ReferenceProperty(CompanyModel,
     collection_name = 'cmpanynotepar')