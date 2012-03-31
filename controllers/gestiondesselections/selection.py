from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.company import CompanyModel
from models.tagmodel import TagModel
from models.selectionmodel import SelectionModel
from models.modelespace import EspaceModel

class SelectionView:
    pass
class Selection(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
        else:
            self.redirect(users.create_login_url(self.request.uri))
# GQL is similar to SQL
        id = self.request.get('id')
        selectionsview = SelectionModel.getSelectionByEspaceID(id)
        
            
            
        
        values = {
            'selections' : selectionsview,
            'id':id,
           
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
        }
        self.response.out.write(template.render('templates/selection.html', values))           
