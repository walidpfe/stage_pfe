from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from bdd import CompanyModel
from tagmodel import TagModel
from selectionmodel import SelectionModel

class SelectionView:
    pass
class LoadSelection(webapp.RequestHandler):
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
        tags_query = TagModel.all()
        tags = tags_query.fetch(10)
        selectionsview = list()
        for company in companies:
            selectionview = SelectionView()
            selectionview.company = company
            selectionsforcompany_query = SelectionModel.all().filter('company = ',company)
            selectionsforcompany = selectionsforcompany_query.fetch(1000)
            tags = list()
            for selection in selectionsforcompany:
                tags.append(selection.tag)
            selectionview.tags = tags
            selectionsview.append(selectionview)
            
            
        
        values = {
            'selections' : selectionsview,
            'companies': companies,
	    'id':id,
            'tags': tags,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
        }
        self.response.out.write(template.render('loadajax.html', values))           
