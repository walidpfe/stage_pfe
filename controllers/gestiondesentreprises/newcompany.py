from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.company import CompanyModel
from models.company import CompanyEmailsModel
from models.company import CompanyTelModel

class Searchcompany(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
        searchkey =  self.request.get('name')
        companies_query = CompanyModel.all().order('-companydateadded')
        companies = companies_query.fetch(30)
        result = list()
        for company in companies:
            
            if company.companyname.lower().find(searchkey.lower())>=0:
                result.append(company.companyname)
            
                    
        if user:
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
        values = {
            'searchkey' : searchkey,
            'result' : result,
        'title': title,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/searchcompany.html', values))
   
class Newcompany(webapp.RequestHandler):
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
                  
        self.response.out.write(template.render('templates/addnewcompany.html', values))           

class Enrgcompany(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
         company  = CompanyModel(
                companyaddedby  = users.get_current_user(),
                companyname = self.request.get('companyname'),
                companywebsite = self.request.get('companywebsite'),
                companyaddress = self.request.get('companyaddress'),
                companywilaya = self.request.get('companywilaya'),
                companydescription = self.request.get('companydescription'))
         company.put();
         emails = self.request.get_all('companymail')
         for email in emails:
            CompanyEmailsModel(email = email , company = company).put()
         tels = self.request.get_all('companytel')
         for tel in tels:
             CompanyTelModel(companytel = tel, company = company).put()     
         
         self.redirect('/')