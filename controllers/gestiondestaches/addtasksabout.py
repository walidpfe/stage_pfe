from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from models.modelespace import EspaceModel
from models.modelespace import EspaceEmailsModel
from models.notemodel import NoteEspaceModel
from models.userprofilemodel import UserProfileModel
from models.tasksmodel import TasksAboutModel
from models.company import CompanyModel

class AddTasksAbout(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'
        if user:
         raw_id = self.request.get('id')
         id = int(raw_id)
         company = CompanyModel.get_by_id(id)
         
         tache = TasksAboutModel(
                profile  = UserProfileModel.getCurrent() ,
                titretache = self.request.get('task[body]'),
                tachepourdate = self.request.get('task[date]'),
                etattache = True,
                organisme = company)
         tache.put();

class RechTasksAbout(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        url = users.create_login_url(self.request.uri)
        url_linktext = 'Login'
        title= 'Ajouter une entreprise'        
        raw_id = self.request.get('id')
        id = int(raw_id)
        company = CompanyModel.get_by_id(id)
        tasks = TasksAboutModel.all().filter('organisme', CompanyModel.get_by_id(id)).filter('profile', UserProfileModel.getCurrent())
        values = {
            'idcompany' : id,
            'tasks' : tasks,      
            'company': company,
            'title': title,
            'user': user,
            'url': url,
            'url_linktext': url_linktext,
          }
                  
        self.response.out.write(template.render('templates/loadtasksabout.html', values))  
