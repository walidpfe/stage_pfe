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
from models.userprofilemodel import UserProfileModel 
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
                organisme = self.request.get('organisme'))
         sujet.put();
         mots = self.request.get_all('motcle')
         for mot in mots:
             MotcleSujetModel(motcle = mot , sujet = sujet).put()
      
         encadreurs = self.request.get_all('autreencadreure')
         for encadreur in encadreurs:
             EncadreurSujetModel(autreencadreur = encadreur , sujet = sujet).put()
                  
         
         self.redirect('/deals')
        
