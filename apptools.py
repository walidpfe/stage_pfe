#!/usr/bin/python


import os

from google.appengine.api import users
from google.appengine.ext.webapp import RequestHandler
from google.appengine.ext.webapp import template


class AppHandler(RequestHandler):
  # *** Private members ***

  # *** Public members ***

  def isNewUser(self):
    return False

  def hasValidUser(self):
    self._user = users.get_current_user()

    if self._user:
      if self.isNewUser():
        self.__setUserPreferences()
      return True
    else:
      self.redirect(users.create_login_url(
          self.request.uri))

  def renderPage(self, fileName, values):
    path = os.path.join(os.path.dirname(__file__),
        fileName)
    self.response.out.write(
        template.render(path, values))

