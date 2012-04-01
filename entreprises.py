from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import mail
from apptools import AppHandler

#gestion des entreprises /controllers/gestiondesentreprises
from controllers.gestiondesentreprises.newcompany import Searchcompany
from controllers.gestiondesentreprises.updateentreprise import Updateentreprise
from controllers.gestiondesentreprises.ficheentreprise import Ficheentreprise
from controllers.gestiondesentreprises.editcompany import Editentreprise
from controllers.gestiondesentreprises.newcompany import Enrgcompany
from controllers.gestiondesentreprises.newcompany import Newcompany
#person
from controllers.gestiondesentreprises.newperson import NewPerson
from controllers.gestiondesentreprises.newperson import EnrgPerson
from controllers.gestiondesentreprises.newperson import NewPersonAt
# note company
from controllers.gestiondesentreprises.ficheentreprise import RechnoteCompany
from controllers.gestiondesentreprises.ficheentreprise import AddnoteCompany

#gestion des taches /controllers/gestiondestaches
from controllers.gestiondestaches.addtasksabout import AddTasksAbout
from controllers.gestiondestaches.addtasksabout import RechTasksAbout

#gestion des contacts /controllers/gestiondescontacts
from controllers.gestiondescontacts.newperson import Newperson

#gestion des espaces /controllers/gestiondesespaces
from controllers.gestiondesespaces.espaceid import Rechnote
from controllers.gestiondesespaces.espaceid import Addnote
from controllers.gestiondesespaces.espaceid import Espaceid
from controllers.gestiondesespaces.newespace import Espace
from controllers.gestiondesespaces.newespace import Newespace
from controllers.gestiondesespaces.newespace import CreeEspace

#gestion des selection /controllers/gestiondesselections
from controllers.gestiondesselections.addtoselection import Addtoselection
from controllers.gestiondesselections.addtoselection  import Addtoallselections
from controllers.gestiondesselections.selection import Selection
from controllers.gestiondesselections.loadselection import LoadSelection
#Selection Sujet
from controllers.gestiondesselections.selectionsujet import SelectionSujet
from controllers.gestiondesselections.addtoselectionsujet import Addtoallsujetselections
from controllers.gestiondesselections.addtoselectionsujet import Addtosujetselection
from controllers.gestiondesselections.loadselectionsujet import LoadSujetSelection

#gestion des sujets /controllers/gestiondessujets
from controllers.gestiondessujets.sujetproposer import Sujet
from controllers.gestiondessujets.sujetproposer import CreeSujet
from controllers.gestiondessujets.sujetproposer import NewSujet
from controllers.gestiondessujets.sujetproposer import SujetId
from controllers.gestiondessujets.sujetproposer import RechnoteSujet
from controllers.gestiondessujets.sujetproposer import AddnoteSujet

#gestion des candidatures /controllers/gestiondescandidatures
from controllers.gestiondescandidatures.postuler import Addtocandidature
from controllers.gestiondescandidatures.postuler import Loadresponsepostuler
from controllers.gestiondescandidatures.postuler import UpdateCandidatureStatus

#gestion du profile /controllers/gestionprofile
from controllers.gestionprofile.profile import Monprofile
from controllers.gestionprofile.profile import UpdateCv
from controllers.gestionprofile.profileof import ProfileOf

#Datastore models
from models.company import CompanyModel
from models.selectionmodel import SelectionModel
from models.modelespace import EspaceEmailsModel



import auth

 
# The main page where the user can login and logout
# MainPage is a subclass of webapp.RequestHandler and overwrites the get method
class SelectionView:
    pass
class MainPage(AppHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
                    
        if self.hasValidUser():
         if self.isNewUser():
            self.redirect("/login")
         else:
       
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
            listdesespaces = EspaceEmailsModel.getMyEspaces()
            companies_query = CompanyModel.all().order('-companydateadded')
            companies = companies_query.fetch(10)
            selection_query = SelectionModel.all()
            selections = selection_query.fetch(10)
       
	
            selectionsview = list()
		
            for company in companies:
                selectionview = SelectionView()
                selectionview.company = company
                selectionview.tags = list()
                companyid = company.key().id_or_name()
	   
            
           
                for espaceid in listdesespaces:
                    newtag = SelectionModel.getAllTagsForCompanyInThisEspace(espaceid,companyid)
                    match = [elt for elt in selectionview.tags if elt == newtag]
                    if not match :

                        selectionview.tags.append(newtag)
            
                selectionsview.append(selectionview)
    
            
            
        
            values = {
                'taggggs' :selectionview.tags,
                'selections' : selectionsview,
                'companies': companies,
	   
           
                'user': user,
                'url': url,
                'url_linktext': url_linktext,
            }
            self.response.out.write(template.render('templates/companies.html', values))
        
# GQL is similar to SQL
        


# This class creates a new Todo item
class ErrorPage(webapp.RequestHandler):
    def get(self):
	values ={}	
        self.response.out.write(template.render('templates/error.html', values))

class UserProfile(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        email = user.email()
	values ={'myemail':email}	
        self.response.out.write(template.render('templates/userprofile.html', values))

#class GotoRootHandler(webapp.RequestHandler):
 #   def get(self):
  #     self.redirect('/login')


#wsgiappp
# Register the URL with the responsible classes
application = webapp.WSGIApplication(
                                     [('/', MainPage),
                                      ('/oauthcallback', auth.CallbackHandler),
                                          ('/catchtoken', auth.CatchTokenHandler),
                                          ('/profile', auth.ProfileHandler),
                                           ('/login', auth.Login),
                                          ('/logout', auth.LogoutHandler),
                                          ('/code', auth.CodeHandler),
                                     ('/monprofile', Monprofile),
                                     ('/updatecv', UpdateCv),
                                      ('/new', Enrgcompany),
                                      ('/newperson', NewPerson),
                                      ('/newpersonat', NewPersonAt),
                                      ('/enrgperson', EnrgPerson),
				                     ('/update', Updateentreprise),
                                      ('/searchcompany' , Searchcompany),
                                         ('/company', Ficheentreprise),
										 ('/notecompany',AddnoteCompany),
										  ('/Rechnotecompany',RechnoteCompany),
                                           ('/editcompany', Editentreprise),
                                      ('/newcompany', Newcompany),
                                       ('/newcontact', Newperson),
                                      ('/espace', Espaceid),
									   ('/selection', Selection),
                                       ('/selectionsujet', SelectionSujet),
									   ('/addtoselection',Addtoselection),
                                       ('/addtosujetselection',Addtosujetselection),
                                      ('/addtoallselections',Addtoallselections),
                                      ('/addtoallsujetselections', Addtoallsujetselections),
                                      ('/notes',Addnote),
                                      ('/notessujet',AddnoteSujet),
                                      ('/kases', Espace),
									  ('/loadselection',LoadSelection),
                                      ('/loadsujetselection',LoadSujetSelection),
									  ('/error',ErrorPage),
                                      ('/deals',Sujet),
                                      ('/sujet', SujetId),
                                      ('/newsujet',CreeSujet),
                                      ('/enrgsujet', NewSujet),
                                      ('/Rechnote',Rechnote),
                                      ('/Rechnotesujet',RechnoteSujet),
                                      ('/enrgespace', Newespace),
                                      ('/userprofile',UserProfile),
                                       ('/profileof',ProfileOf),
									  ('/addtocandidature',Addtocandidature),
                                       ('/loadresponsepostuler',Loadresponsepostuler),
                                      ('/updatecandidaturestatus',UpdateCandidatureStatus),
                                      ('/addtasksabout', AddTasksAbout),
								       ('/rechtasksabout', RechTasksAbout),
   #                                   ('/.*', GotoRootHandler),
                                      ('/newespace', CreeEspace)],
                                     debug=True)

# Register the wsgi application to run
def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
