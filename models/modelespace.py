from google.appengine.ext import db
from google.appengine.api import users


class EspaceModel(db.Model):
     creepar     = db.UserProperty(required=True)
     typedestage        = db.StringProperty(required=True, choices=set(["pfe", "se", "so"]))
     creedate   = db.DateTimeProperty(auto_now_add=True)
     collaborateur = db.UserProperty

class ActivatedEspace(db.Model):
     member = db.UserProperty(required=True)
     espace = db.ReferenceProperty(EspaceModel,
      collection_name = 'espaceactif')
     
     @classmethod
     def getCurrent(self):

         userespace = ActivatedEspace.all().filter('user = ',
          users.get_current_user()).get()

         return userespace.espace
     
     @classmethod
     def setActif(self,espace):
          if ActivatedEspace.isNew():
              userespace = ActivatedEspace( user = users.get_current_user(),
                                            espace = espace)
              userespace.put()
          else:
              userespace = ActivatedEspace.all().filter('user = ',
               users.get_current_user()).get()
              userespace.espace = espace
              userespace.put()

     @classmethod
     def isNew(self):
         query = ActivatedEspace.gql("WHERE user = :1",
             users.get_current_user())
         return (query.count() == 0)

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


  @classmethod
  def getEspaceMembers(self, id):

     listOfEmailsInEspace = list()
     listOfEmailsInEspace.append(EspaceModel.get_by_id(id).creepar.email())
     autrecollaborateurs = EspaceEmailsModel.getAllEmailsByEspaceID(id)
     for c in autrecollaborateurs:
          listOfEmailsInEspace.append(c.autrecollaborateur)
  
     


     return listOfEmailsInEspace



     
     
     
     
   


  @property
  def id_or_name(self):
    return self.key().id_or_name()
