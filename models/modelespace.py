from google.appengine.ext import db
from google.appengine.api import users


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
  def getAllEmailsByEspaceID(self,id):
    return EspaceEmailsModel.all().filter('espace =',
        EspaceModel.get_by_id(id))

  @classmethod
  def getMyEspaces(self):

     listOfEspacesIds = list()
  
     espaces_query = EspaceModel.all().filter('creepar = ',users.get_current_user())
     espaces = espaces_query.fetch(1000)
     for espace in espaces:
          listOfEspacesIds.append(espace.key().id_or_name())
          
     myemail = users.get_current_user().email()
     

     autreEspaces_query = EspaceEmailsModel.all().filter('autrecollaborateur = ', myemail)
     autreEspaces = autreEspaces_query.fetch(1000)
     for autreEspace in autreEspaces:
          listOfEspacesIds.append(autreEspace.espace.key().id_or_name())


     return listOfEspacesIds
     
     
     
     
   


  @property
  def id_or_name(self):
    return self.key().id_or_name()