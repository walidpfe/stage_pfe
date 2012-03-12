from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from company import CompanyModel
from companyemails import CompanyEmailsModel
from tagmodel import TagModel
from modelespace import EspaceModel
from selectionmodel import SelectionModel


class Deletefromselection(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
         

         tagname = self.request.get('tags')
         raw_id = self.request.get('id')
         id = int(raw_id)
         lespace = EspaceModel.get_by_id(id)
         
         tag = TagModel(name =tagname , espace = lespace)
         tag.put();
         idlist = self.request.get_all('id[]')
         for idcompany in idlist:
             idc = int(idcompany)
             company = CompanyModel.get_by_id(idc)
             
             selection = SelectionModel(espace = lespace, company = company, tag = tag,
                                        selectedby =users.get_current_user()).put()

         
         values = {
             
            
	    'idlist': idlist,
	    
          }
         self.response.out.write(template.render('afterselection.html', values))
                 
         
         #self.redirect('/')
