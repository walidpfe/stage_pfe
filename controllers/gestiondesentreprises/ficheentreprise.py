from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.company import CompanyModel
from models.company import CompanyEmailsModel
from models.company import NoteCompanyModel
from models.userprofilemodel import UserProfileModel
from models.company import CompanyTelModel

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
            emails = CompanyEmailsModel.getAllEmailsByCompanyID(id)
            notes = NoteCompanyModel.all().order('creedate').filter('company', CompanyModel.get_by_id(id))
            tels = CompanyTelModel.getAllTelsByCompanyID(id)
       
            
        else:
            self.redirect(users.create_login_url(self.request.uri))
		

       
        values = {
            'emails' : emails,
            'idcompany' : id,
            'tels' : tels,
            'company': lentreprise,
            'notes' : notes,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
        }
        self.response.out.write(template.render('templates/fiche_entreprise.html', values))

class AddnoteCompany(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
        if user:
         raw_id = self.request.get('noteespace')
         id = int(raw_id)
         lacompany = CompanyModel.get_by_id(id)
         note  = NoteCompanyModel(
                profile  = UserProfileModel.getCurrent(),
                texnote = self.request.get('notebody'),
                company = lacompany)
         note.put();

class RechnoteCompany(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title = 'Ajouter une entreprise'        
        raw_id = self.request.get('id')
        id = int(raw_id)
        lentreprise = CompanyModel.get_by_id(id)
        emails = CompanyEmailsModel.getAllEmailsByCompanyID(id)
        tels = CompanyTelModel.getAllTelsByCompanyID(id)
        notes = NoteCompanyModel.all().order('creedate').filter('company', CompanyModel.get_by_id(id))
        values = { 
            'emails' : emails,
            'tels' : tels,
            'company': lentreprise,
            'idcompany' : id,
            'notes' : notes,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
           }
        self.response.out.write(template.render('templates/loadnotecompany.html', values))


