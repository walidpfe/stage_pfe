from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from modelespace import EspaceModel
from modelespace import EspaceEmailsModel
class Espace(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
        listedesespaces = EspaceEmailsModel.getMyEspaces()
	mesespaces = list()
	for espaceid in listedesespaces:
		mesespaces.append(EspaceModel.get_by_id(espaceid))
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
            monespace = EspaceModel.all().filter('creepar', user)
	    
	    
        values = {
            'listdesespaces': listedesespaces,
            'title': title,
            'monespace': mesespaces,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('espacepros.html', values))           

class CreeEspace(webapp.RequestHandler):
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
                  
        self.response.out.write(template.render('newespace.html', values))           

class Newespace(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
         espace  = EspaceModel(
                creepar  = users.get_current_user(),
                typedestage = self.request.get('typestage'),
                collaborateur = self.request.get('mailcollab'))
         espace.put();
         emails = self.request.get_all('mailcollab')
         for email in emails:
            EspaceEmailsModel(autrecollaborateur = email , espace = espace).put()
                 
         
         self.redirect('/kases')
        
