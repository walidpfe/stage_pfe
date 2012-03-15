from google.appengine.ext import db
from google.appengine.api import users
from modelespace import EspaceModel

class NoteEspaceModel(db.Model):
     creepar     = db.UserProperty(required=True)
     creedate   = db.DateTimeProperty(auto_now_add=True)
     texnote = db.StringProperty(multiline=True)
     espace = db.ReferenceProperty(EspaceModel,
     collection_name = 'espacenote')