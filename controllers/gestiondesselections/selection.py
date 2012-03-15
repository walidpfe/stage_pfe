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
        companies_query = CompanyModel.all().order('-companydateadded')
        companies = companies_query.fetch(10)
        selection_query = SelectionModel.all()
        selections = selection_query.fetch(10)
        id = self.request.get('id')
        espaceid = int(id)
	espace = EspaceModel.get_by_id(espaceid)
        selectionsview = list()
		
        for company in companies:
            selectionview = SelectionView()
	    selectionview.company = company
	    companyid = company.key().id_or_name()
            
            selectionview.tags = SelectionModel.getAllTagsForCompanyInThisEspace(espaceid,companyid)
            selectionsview.append(selectionview)
            
            
        
        values = {
            'selections' : selectionsview,
            'companies': companies,
	    'id':id,
           
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
        }
        self.response.out.write(template.render('templates/selection.html', values))           
