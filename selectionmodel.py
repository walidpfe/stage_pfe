


from google.appengine.ext import db

from bdd import CompanyModel
from modelespace import EspaceModel
from tagmodel import TagModel


class SelectionModel(db.Model):
  espace = db.ReferenceProperty(EspaceModel,
      collection_name = 'espaceselection')
  company = db.ReferenceProperty(CompanyModel,
      collection_name = 'companyselection')
  tag = db.ReferenceProperty(TagModel,
      collection_name = 'tagselection')
  selectedby     = db.UserProperty(required=True)
  dateselected   = db.DateTimeProperty(auto_now_add=True)
  



