from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from bdd import CompanyModel

class Editentreprise(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
            raw_id = self.request.get('id')
            ido = int(raw_id)
            lentrepriseo = CompanyModel.get_by_id(ido)
            
        else:
            self.redirect(users.create_login_url(self.request.uri))
# GQL is similar to SQL
      
        
        
        values = {
            'company': lentrepriseo,
        
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
        }
        self.response.out.write(template.render('editcompany.html', values))

