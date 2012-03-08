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
from updateentreprise import Updateentreprise
from ficheentreprise import Ficheentreprise
from editcompany import Editentreprise
from newcompany import Newcompany
from bdd import CompanyModel
from selection import Selection
from loadselection import LoadSelection

# Todo defines the data model for the Todos

 
# The main page where the user can login and logout
# MainPage is a subclass of webapp.RequestHandler and overwrites the get method
class MainPage(webapp.RequestHandler):
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
        
        
        values = {
            'companies': companies,
	    
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
        }
        self.response.out.write(template.render('companies.html', values))


# This class creates a new Todo item





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
                                      ('/kases', Espace),
									  ('/loadselection',LoadSelection),
                                      ('/enrgespace', Newespace),
                                      ('/newespace', CreeEspace)],
                                     debug=True)

# Register the wsgi application to run
def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
