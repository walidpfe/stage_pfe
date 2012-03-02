from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import mail
from apptools import AppHandler

# Todo defines the data model for the Todos

class CompanyModel(db.Model):
  companyaddedby  = db.UserProperty(required=True)
  companyname     = db.StringProperty()
  companytel     = db.StringProperty()
  companymail     = db.StringProperty()
  companywebsite     = db.StringProperty()
  companyaddress     = db.StringProperty(multiline=True)
  companywilaya     = db.StringProperty()
  companydescription = db.StringProperty(multiline=True)
  companydateadded= db.DateTimeProperty(auto_now_add=True)
  
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
class New(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
	    company  = CompanyModel(
                companyaddedby  = users.get_current_user(),
                companyname = self.request.get('companyname'),
                companytel = self.request.get('companytel'),
                companymail = self.request.get('companymail'),
                companywebsite = self.request.get('companywebsite'),
                companyaddress = self.request.get('companyaddress'),
                companywilaya = self.request.get('companyawilaya'),
                companydescription = self.request.get('companydescription'))
            
            company.put();
            self.redirect('/')

class Updateentreprise(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
          raw_id = self.request.get('id')
          id = int(raw_id)
          lentreprise = CompanyModel.get_by_id(id)
          lentreprise.companyaddedby  = users.get_current_user()
          lentreprise.companyname = self.request.get('companyname')
          lentreprise.companytel = self.request.get('companytel')
          lentreprise.companymail = self.request.get('companymail')
          lentreprise.companywebsite = self.request.get('companywebsite')
          lentreprise.companyaddress = self.request.get('companyaddress')
          lentreprise.companywilaya = self.request.get('companyawilaya')
          lentreprise.companydescription = self.request.get('companydescription')
            
          lentreprise.put();
          self.redirect('/company?id='+raw_id)
	    

class Newcompany(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
        values = {
            
	    
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
	              
        self.response.out.write(template.render('ajouteruneentreprise.html', values))           


class Ficheentreprise(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
            raw_id = self.request.get('id')
            id = int(raw_id)
            lentreprise = CompanyModel.get_by_id(id)
            
        else:
            self.redirect(users.create_login_url(self.request.uri))

        
        values = {
            'company': lentreprise,
        
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
        }
        self.response.out.write(template.render('fiche_entreprise.html', values))


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


#wsgiappp
# This class deletes the selected Todo
# Register the URL with the responsible classes
application = webapp.WSGIApplication(
                                     [('/', MainPage),
                                      ('/new', New),
				               ('/update', Updateentreprise),
                                         ('/company', Ficheentreprise),
                                           ('/editcompany', Editentreprise),
                                      ('/newcompany', Newcompany)],
                                     debug=True)

# Register the wsgi application to run
def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
