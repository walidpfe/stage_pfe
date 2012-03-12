from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from company import CompanyModel
from companyemails import CompanyEmailsModel
from tagmodel import TagModel
from modelespace import EspaceModel
from modelespace import EspaceEmailsModel
from selectionmodel import SelectionModel


class Addtoallselections(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
         

         tagname = self.request.get('tags')
         listdesespaces = EspaceEmailsModel.getMyEspaces()
         
         tag = TagModel(name =tagname).put();
         
         for idespace in listdesespaces:
             lespace = EspaceModel.get_by_id(idespace)
                
            
             idlist = self.request.get_all('id[]')
             for idcompany in idlist:
                 idc = int(idcompany)
                 company = CompanyModel.get_by_id(idc)
             
                 
             
                 selection = SelectionModel(espace = lespace, company = company, tag = tag,
                                        selectedby =users.get_current_user()).put()

                          
         
         #self.redirect('/')
