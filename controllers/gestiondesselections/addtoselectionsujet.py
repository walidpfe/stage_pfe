from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.modelsujet import SujetModel
from models.modelsujet import TagSujetModel
from models.modelsujet import SelectionSujetModel
from models.modelespace import EspaceModel
from models.modelespace import EspaceEmailsModel



class Addtosujetselection(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
         

         tagname = self.request.get('tags')
         raw_id = self.request.get('id')
         id = int(raw_id)
         lespace = EspaceModel.get_by_id(id)
         
         tag = TagSujetModel(name =tagname , espace = lespace)
         tag.put();
         idlist = self.request.get_all('id[]')
         for idsujet in idlist:
             idc = int(idsujet)
             sujet = SujetModel.get_by_id(idc)
             
             selection = SelectionSujetModel(espace = lespace, sujet = sujet, tag = tag,
                                        selectedby =users.get_current_user()).put()

         
         values = {
             
            
	    'idlist': idlist,
	    
          }
         #self.response.out.write(template.render('afterselection.html', values))
                 
         
         #self.redirect('/')


class Addtoallsujetselections(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
         

         tagname = self.request.get('tags')
         listdesespaces = EspaceEmailsModel.getMyEspaces()
         
         tag = TagSujetModel(name = tagname).put();
         
         for idespace in listdesespaces:
             lespace = EspaceModel.get_by_id(idespace)
                
            
             idlist = self.request.get_all('id[]')
             for idsujet in idlist:
                 idc = int(idsujet)
                 sujet = SujetModel.get_by_id(idc)
             
                 
             
                 selection = SelectionSujetModel(espace = lespace, sujet = sujet, tag = tag,
                                        selectedby =users.get_current_user()).put()

        