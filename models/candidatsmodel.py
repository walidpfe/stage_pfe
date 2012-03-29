from google.appengine.ext import db

from modelsujet import SujetModel
from modelespace import EspaceModel




class CandidatsModel(db.Model):
  sujet = db.ReferenceProperty(SujetModel,
      collection_name = 'sujetcandidats')
  espace = db.ReferenceProperty(EspaceModel,
      collection_name = 'espacecandidats')
  postulepar     = db.UserProperty(required=True)
  datepostule   = db.DateTimeProperty(auto_now_add=True)
  etatcandidature = db.StringProperty()
  lettredemotivation = db.TextProperty()


  @classmethod
  def setCandidatureStatus(self,idcandidature,status):
    c = CandidatsModel.get_by_id(idcandidature)
    c.etatcandidature = status
    c.put()
 
  
  
  



