from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.company import CompanyModel
from models.company import CompanyEmailsModel
from models.company import CompanyTelModel
from models.person import PersonModel
from models.person import PersonEmailsModel
from models.person import PersonTelModel
   
class NewPerson(webapp.RequestHandler):
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
                  
        self.response.out.write(template.render('templates/addnewperson.html', values))  
        
class NewPersonAt(webapp.RequestHandler):
     def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
        if user:
         raw_id = self.request.get('id')
         id = int(raw_id)
         company = CompanyModel.get_by_id(id)
         values = {
            'company': company,
            'title': title,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/addnewpersonat.html', values))  
        

class EnrgPerson(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
         person  = PersonModel(
                personaddedby  = users.get_current_user(),
                personname = self.request.get('companyname'),
                personpname = self.request.get('prenom'),
                organisme = CompanyModel.getCompanyByName(self.request.get('organisme').strip()),
                fonction =  self.request.get('fonction'),
                personwebsite = self.request.get('companywebsite'),
                personaddress = self.request.get('companyaddress'),
                personwilaya = self.request.get('companywilaya'),
                persondescription = self.request.get('companydescription'))
         person.put();
         emails = self.request.get_all('companymail')
         for email in emails:
            PersonEmailsModel(email = email , person = person).put()
         tels = self.request.get_all('companytel')
         for tel in tels:
             PersonTelModel(persontel = tel, person = person).put()     
         
         self.redirect('/')