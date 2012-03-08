


from google.appengine.ext import db

from modelespace import EspaceModel


class TagModel(db.Model):
  name = db.StringProperty()
  espace = db.ReferenceProperty(EspaceModel,
      collection_name = 'tags')


 
