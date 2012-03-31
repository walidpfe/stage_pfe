from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.modelespace import EspaceModel
from models.candidatsmodel import CandidatsModel
from models.modelespace import EspaceEmailsModel
from models.notemodel import NoteEspaceModel
from models.modelsujet import SelectionSujetModel
from models.selectionmodel import SelectionModel
from models.userprofilemodel import UserProfileModel
class Espaceid(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
            raw_id = self.request.get('id')
            id = int(raw_id)
            lespace = EspaceModel.get_by_id(id)
            emails = EspaceEmailsModel.getAllEmailsByEspaceID(id)
            notes = NoteEspaceModel.all().order('-creedate').filter('espace', EspaceModel.get_by_id(id))
            userinfo = UserProfileModel.getCurrent()
            usersemailsinespace = EspaceEmailsModel.getEspaceMembers(id)
            selectionsview = SelectionSujetModel.getSelectionByEspaceID(raw_id)
            selectionsdescontacts = SelectionModel.getSelectionByEspaceID(id)
          
            candidaturesaffectees = CandidatsModel.getCandidaturesInEspaceBystatus(id,'affecte')
            candidaturesfiledattente = CandidatsModel.getCandidaturesInEspaceBystatus(id,'filedattente')
            candidaturesenattente = CandidatsModel.getCandidaturesInEspaceBystatus(id,'en attente')
            candidaturesrefusee = CandidatsModel.getCandidaturesInEspaceBystatus(id,'refusee')
            
        
        values = {
            'candidaturesaffectees' : candidaturesaffectees,
            'candidaturesfiledattente' : candidaturesfiledattente ,
            'candidaturesenattente' : candidaturesenattente ,
            'candidaturesrefusee' :candidaturesrefusee ,
            'selectionsdescontacts' :selectionsdescontacts ,
            'candidaturesrefusee' :candidaturesrefusee ,
            'selections' : selectionsview,
            'emailsinespace': usersemailsinespace,
            'userinfo': userinfo,
            'idespace' :id,      
            'notes' : notes,      
            'emails' : emails,
            'espace': lespace,
            'title': title,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/espace.html', values))           

class Addnote(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
        if user:
         raw_id = self.request.get('noteespace')
         id = int(raw_id)
         lespace = EspaceModel.get_by_id(id)
         note  = NoteEspaceModel(
                profile  = UserProfileModel.getCurrent() ,
                texnote = self.request.get('notebody'),
                espace = lespace)
         note.put();

class Rechnote(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'        
        raw_id = self.request.get('id')
        id = int(raw_id)
        lespace = EspaceModel.get_by_id(id)
        emails = EspaceEmailsModel.getAllEmailsByEspaceID(id)
        notes = NoteEspaceModel.all().order('-creedate').filter('espace', EspaceModel.get_by_id(id))
        values = {
            'idespace' :id,      
            'notes' : notes,      
            'emails' : emails,
            'espace': lespace,
            'title': title,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/loadespace.html', values))  
