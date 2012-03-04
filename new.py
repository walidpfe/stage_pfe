from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from bdd import CompanyModel

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
