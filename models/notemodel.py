from google.appengine.ext import db
from google.appengine.api import users
from models.modelespace import EspaceModel
from models.userprofilemodel import UserProfileModel

class NoteEspaceModel(db.Model):
     profile     = db.ReferenceProperty(UserProfileModel,
                           collection_name = 'userespacenote')
     creedate   = db.DateTimeProperty(auto_now_add=True)
     texnote = db.TextProperty()
     espace = db.ReferenceProperty(EspaceModel,
     collection_name = 'espacenote')