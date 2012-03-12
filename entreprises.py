from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import mail

from espaceid import Espaceid
from newespace import Espace
from newespace import Newespace
from newespace import CreeEspace
from new import New
from addtoselection import Addtoselection
from  addtoallselections  import Addtoallselections
from updateentreprise import Updateentreprise
from ficheentreprise import Ficheentreprise
from editcompany import Editentreprise
from newcompany import Newcompany
from bdd import CompanyModel
from selection import Selection
from loadselection import LoadSelection
from selectionmodel import SelectionModel
from modelespace import EspaceEmailsModel

# Todo defines the data model for the Todos

 
# The main page where the user can login and logout
# MainPage is a subclass of webapp.RequestHandler and overwrites the get method
class SelectionView:
    pass
class MainPage(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
            listdesespaces = EspaceEmailsModel.getMyEspaces()
            companies_query = CompanyModel.all().order('-companydateadded')
            companies = companies_query.fetch(10)
            selection_query = SelectionModel.all()
            selections = selection_query.fetch(10)
       
	
            selectionsview = list()
		
            for company in companies:
                selectionview = SelectionView()
                selectionview.company = company
                selectionview.tags = list()
                companyid = company.key().id_or_name()
	   
            
           
                for espaceid in listdesespaces:
                    newtag = SelectionModel.getAllTagsForCompanyInThisEspace(espaceid,companyid)
                    match = [elt for elt in selectionview.tags if elt == newtag]
                    if not match :

                        selectionview.tags.append(newtag)
            
                selectionsview.append(selectionview)
    
            
            
        
            values = {
                'taggggs' :selectionview.tags,
                'selections' : selectionsview,
                'companies': companies,
	   
           
                'user': user,
                'url': url,
                'url_linktext': url_linktext,
            }
            self.response.out.write(template.render('companies.html', values))
        else:
            self.redirect(users.create_login_url(self.request.uri))
# GQL is similar to SQL
        


# This class creates a new Todo item
class ErrorPage(webapp.RequestHandler):
    def get(self):
	values ={}	
        self.response.out.write(template.render('error.html', values))




#wsgiappp
# Register the URL with the responsible classes
application = webapp.WSGIApplication(
                                     [('/', MainPage),
                                      ('/new', New),
				               ('/update', Updateentreprise),
                                         ('/company', Ficheentreprise),
                                           ('/editcompany', Editentreprise),
                                      ('/newcompany', Newcompany),
                                      ('/espace', Espaceid),
									   ('/selection', Selection),
									   ('/addtoselection',Addtoselection),
                                      ('/addtoallselections',Addtoallselections),
                                      ('/kases', Espace),
									  ('/loadselection',LoadSelection),
									  ('/error',ErrorPage),
                                      ('/enrgespace', Newespace),
                                      ('/newespace', CreeEspace)],
                                     debug=True)

# Register the wsgi application to run
def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
