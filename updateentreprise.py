from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.company import CompanyModel


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
        