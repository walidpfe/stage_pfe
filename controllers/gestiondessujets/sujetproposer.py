from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.modelespace import EspaceModel
from models.modelespace import EspaceEmailsModel
from models.modelsujet import SujetModel
from models.modelsujet import EncadreurSujetModel
from models.modelsujet import MotcleSujetModel
from models.modelsujet import NoteSujetModel
from models.userprofilemodel import UserProfileModel
from models.candidatsmodel import CandidatsModel
from models.company import CompanyModel

class Sujet(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
        listedesujet = SujetModel.all().filter('sujetaddedby =', user)
                  
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
            userinfo = UserProfileModel.getCurrent() 
       
          
        
        values = {
            'title': title,
            'userinfo': userinfo,
            'listedesujet': listedesujet,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/sujetproposer.html', values))           

class CreeSujet(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
        values = {
         'title': title,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/newsujet.html', values))           

class NewSujet(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
         sujet  = SujetModel(
                sujetaddedby  = users.get_current_user(),
                titresujet = self.request.get('sujettitre'),
                description = self.request.get('Resume'),
                organismeref = CompanyModel.getCompanyByName(self.request.get('organisme').strip()))
         sujet.put();
         mots = self.request.get_all('motcle')
         for mot in mots:
             MotcleSujetModel(motcle = mot , sujet = sujet).put()
      
         encadreurs = self.request.get_all('autreencadreure')
         for encadreur in encadreurs:
             EncadreurSujetModel(autreencadreur = encadreur , sujet = sujet).put()
    
         self.redirect('/deals')
class CandidatureView:
    pass       
class SujetId(webapp.RequestHandler):
      def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
            espaceid = self.request.get('espaceid')
            raw_id = self.request.get('id')
            id = int(raw_id)
            lesujet = SujetModel.get_by_id(id)
            emails = EncadreurSujetModel.getAllEmailsBySujetID(id)
            notes = NoteSujetModel.all().order('creedate').filter('sujet', SujetModel.get_by_id(id))
            mots = MotcleSujetModel.all().filter('sujet', SujetModel.get_by_id(id))
            userinfo = UserProfileModel.getCurrent()
            candidatures_query = CandidatsModel.all().filter('sujet = ', lesujet)
            candidatures = candidatures_query.fetch(10)
            candidaturesview = list()
            for c in candidatures:
                candidatureview = CandidatureView()
                candidatureview.etatcandidature = c.etatcandidature
                candidatureview.id = c.key().id_or_name()
                emails = EspaceEmailsModel.getEspaceMembers(c.espace.key().id_or_name())
                usersprofiles = list()
                for email in emails:
                    uprofile = UserProfileModel.getProfileByEmail(email)
                    if uprofile:
                        usersprofiles.append(uprofile)
                        
                candidatureview.eid = c.espace.key().id()
                candidatureview.up = usersprofiles
                candidatureview.usersemails = emails
                candidaturesview.append(candidatureview) 
            
             
        
        values = {
            'candidatures' : candidaturesview ,
            'espaceid' : espaceid,
            'userinfo': userinfo,
            'idsujet' :id,      
            'notes' : notes,
            'mots' : mots,     
            'emails' : emails,
            'sujet': lesujet,
            'title': title,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/fiche_sujet.html', values))           
class AddnoteSujet(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
        if user:
         raw_id = self.request.get('noteespace')
         id = int(raw_id)
         lesujet = SujetModel.get_by_id(id)
         note  = NoteSujetModel(
                profile  = UserProfileModel.getCurrent(),
                texnote = self.request.get('notebody'),
                sujet = lesujet)
         note.put();

class RechnoteSujet(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'        
        raw_id = self.request.get('id')
        id = int(raw_id)
        lesujet = SujetModel.get_by_id(id)
        emails = EncadreurSujetModel.getAllEmailsBySujetID(id)
        mots = MotcleSujetModel.all().filter('sujet', SujetModel.get_by_id(id))
        notes = NoteSujetModel.all().order('creedate').filter('sujet', SujetModel.get_by_id(id))
        values = {
            'idespace' :id,      
            'notes' : notes,      
            'emails' : emails,
            'mots' : mots, 
            'espace': lesujet,
            'title': title,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/loadnotesujet.html', values)) 

