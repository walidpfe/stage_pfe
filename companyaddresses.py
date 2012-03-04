from google.appengine.ext import db

from company import CompanyModel


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

