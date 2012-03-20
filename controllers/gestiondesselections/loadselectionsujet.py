from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.modelsujet import SujetModel
from models.modelsujet import TagSujetModel
from models.modelsujet import SelectionSujetModel
from models.modelespace import EspaceModel

class SelectionView:
    pass
class LoadSujetSelection(webapp.RequestHandler):
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
        sujets_query = SujetModel.all().order('-sujetdateadded')
        sujets = sujets_query.fetch(10)
        selection_query = SelectionSujetModel.all()
        selections = selection_query.fetch(10)
        id = self.request.get('id')
        espaceid = int(id)
	espace = EspaceModel.get_by_id(espaceid)
        selectionsview = list()
        for sujet in sujets:
            selectionview = SelectionView()
	    selectionview.sujet = sujet
            sujetid = sujet.key().id_or_name()
            
            selectionview.tags = SelectionSujetModel.getAllTagsForSujetInThisEspace(espaceid,sujetid)
            selectionsview.append(selectionview)
            
            
        
        values = {
            'selections' : selectionsview,
            'sujets': sujets,
	    'id':id,
            
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
        }
        self.response.out.write(template.render('templates/loadsujet.html', values))           
