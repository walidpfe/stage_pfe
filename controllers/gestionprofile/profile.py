from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.userprofilemodel import UserProfileModel



class Monprofile(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
        #from models.userprofilemodel import UserProfileModel
        userinfo = UserProfileModel.getCurrent() 
        #'userinfo': userinfo,          
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
          
        
        values = {
            'title': title,
            'userinfo': userinfo,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/monprofile.html', values))           
