from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template

from models.modelespace import EspaceModel
from models.candidatsmodel import CandidatsModel
from models.modelespace import EspaceEmailsModel
from models.modelsujet import SujetModel


class Addtocandidature(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
        
         #récupérer le @sujet
         sujetid = self.request.get('sujetid')
         idsujet = int(sujetid)
         lesujet = SujetModel.get_by_id(idsujet)   
         #récupérer l '@espace
         espaceid = self.request.get('espaceid')
         idespace = int(espaceid)
         lespace = EspaceModel.get_by_id(idespace)
         #récupérer la lettre de motivation
         lettredemotivation = self.request.get('lettredemotivation')
         candidature = CandidatsModel(sujet= lesujet, espace = lespace,
                                      postulepar = users.get_current_user(),
                                      etatcandidature = 'en attente',
                                      lettredemotivation = lettredemotivation).put()




class UpdateCandidatureStatus(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user:

         # [important] To do : vérifier si on a le droit
        
         #récupérer la @candidature 
         idc = self.request.get('idc')
         idcandidature = int(idc)
         #récupérer le status 
         status = self.request.get('status')

         #récupérer l' @espce
         ide = self.request.get('ide')

         #récupérer le @sujet
         ids = self.request.get('ids')
         #Si le status == 'affecte' modifier l'état du sujet
         if status=='affecte':
             idsujet = int(ids)
             lesujet = SujetModel.get_by_id(idsujet)
             if lesujet.etatdaffectation=="affecte":
                 
                 self.redirect('/sujet?id='+ids+'&espaceid='+ide+'#affectation')
                 return
                 
             lesujet.etatdaffectation = status
             lesujet.put()
         if status=='annulee':
             idsujet = int(ids)
             lesujet = SujetModel.get_by_id(idsujet)
             lesujet.etatdaffectation = 'non affecte'
             lesujet.put()
             

        
         
         #Modifier l'état de la candidature      

         CandidatsModel.setCandidatureStatus(idcandidature,status)

         # [important] To do : Notification
         self.redirect('/sujet?id='+ids+'&espaceid='+ide+'#affectation')
         
        

        
class Loadresponsepostuler(webapp.RequestHandler):
    def get(self):
        values = {}
        self.response.out.write(template.render('templates/loadresponsepostuler.html', values))
        
