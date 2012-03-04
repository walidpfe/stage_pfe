from google.appengine.ext import db

from company import CompanyModel


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

