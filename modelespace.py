from google.appengine.ext import db



class EspaceModel(db.Model):
     creepar     = db.UserProperty(required=True)
     typedestage        = db.StringProperty(required=True, choices=set(["pfe", "se", "so"]))
     creedate   = db.DateTimeProperty(auto_now_add=True)
     collaborateur = db.UserProperty

class EspaceEmailsModel (db.Model):
  autrecollaborateur = db.StringProperty()
  espace       = db.ReferenceProperty(EspaceModel,
      collection_name = 'emails')


  @classmethod
  def getAll(self):
    return EspaceEmailsModel.all().filter('espace =',
        self.getEspace())
  


  @property
  def id_or_name(self):
    return self.key().id_or_name()
