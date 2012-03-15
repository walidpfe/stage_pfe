#!/usr/bin/python


import os

from google.appengine.api import users
from google.appengine.ext.webapp import RequestHandler
from google.appengine.ext.webapp import template


from models.userprofilemodel import UserProfileModel


class AppHandler(RequestHandler):
  # *** Private members ***

  # *** Public members ***

  def isNewUser(self):
    query = UserProfileModel.gql("WHERE user = :1",
        users.get_current_user())
    return (query.count() == 0)

  def hasValidUser(self):
    self._user = users.get_current_user()

    if not self._user:
      self.redirect(users.create_login_url(
          self.request.uri))
    else:
      return True


  def hasAdminUser(self):
    if self.hasValidUser():
      return users.is_current_user_admin()
    else:
      return False

  def getLogOffURL(self):
    return users.create_logout_url(self.request.uri)

  def renderPage(self, fileName, values):
    path = os.path.join(os.path.dirname(__file__),
        fileName)
    self.response.out.write(
        template.render(path, values))

